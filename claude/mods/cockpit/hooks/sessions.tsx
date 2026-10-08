import { atom, read, update } from 'claude-code'
import type { EngineInterface as Engine, Register } from 'claude-code'

import type { FleetLink, FleetRow, FleetView, Reference } from '../types'
import { barCells, barRects, level, packCells } from './bar'
import { refLook, refOfUrl } from './references'
import type { RefTone } from './references'
import { cells, fit, pad } from './text'
import { parsePrLinkScan, prLinkScan, transcriptPath } from './transcript'

const PANE = 'sessions-view'
const TITLE = 'Sessions'
const POLL_MS = 2000
/** The docked pane's opening width, as a share of the terminal. */
const DOCK_SHARE = 0.2
const DOCK_MIN_COLUMNS = 28
const BAR_CELLS = 20
/** Cells for the status glyph and its gap, so names line up with the indented lines below. */
const LABEL_CELLS = 3

const fleet = atom({ plugin: 'cockpit', key: 'fleet' } as const, {
  rows: [],
  refreshedAt: 0,
} satisfies FleetView)

/** Whether the list shows every session on this machine instead of only this repo's. Kept across hot reloads. */
const allRepos = atom({ plugin: 'cockpit', key: 'allRepos' } as const, false)

// ---- data ------------------------------------------------------------------

type AgentsJsonRow = {
  id?: string
  pid?: number
  cwd: string
  kind: 'interactive' | 'background'
  startedAt: number
  sessionId: string
  name: string
  state?: string
  status?: string
}

type JobState = {
  state?: string
  children?: Array<{ id?: string; href?: string; kind?: string }> | null
}

const HOTKEYS = '123456789abcdefghijklmnopqrstuvwxyz'

let isRegistered = false
let isRefreshing = false
/** A refresh asked for while one ran (the scope toggle): run once more when it ends. */
let isRefreshQueued = false
let isSized = false

/** Opens the pane at 20% of a terminal `columns` wide, once; a person's own drag wins later. */
const openSized = async ($: Engine, columns: number | undefined, focus?: true) => {
  if (isSized || columns === undefined || columns <= 0) {
    return $.ui.open({ id: PANE, title: TITLE, ...(focus ? { focus } : {}) })
  }
  isSized = true
  return $.ui.open({
    id: PANE,
    title: TITLE,
    columns: Math.max(DOCK_MIN_COLUMNS, Math.round(columns * DOCK_SHARE)),
    ...(focus ? { focus } : {}),
  })
}
let selfId: string | undefined
let home: string | undefined
let scope: string | undefined

const ensureCommand = async ($: Engine) => {
  if (isRegistered) return
  await $.command.register({
    name: 'sessions-view',
    description: 'Open the Sessions pane: every Claude session on this machine, as `claude agents` lists them',
  })
  isRegistered = true
}

/** The directory the list is scoped to: this repo's root, else the session's cwd. */
const scopeDir = async ($: Engine): Promise<string | undefined> => {
  const repo = await $.session.repo().catch(() => null)
  if (repo?.root) return repo.root
  return $.session.cwd().catch(() => undefined)
}

const BRANCH_TTL_MS = 10_000
const branches = new Map<string, { value: string | undefined; at: number }>()

/** The branch at `cwd`, cached a few polls; undefined outside a repo. */
const branchOf = async ($: Engine, cwd: string): Promise<string | undefined> => {
  const hit = branches.get(cwd)
  if (hit && Date.now() - hit.at < BRANCH_TTL_MS) return hit.value
  let value: string | undefined
  try {
    const r = await $.process.run(['git', '-C', cwd, 'rev-parse', '--abbrev-ref', 'HEAD'], { timeoutMs: 3000 })
    const name = r.stdout.trim()
    if (r.exitCode === 0 && name && name !== 'HEAD') value = name
    else if (r.exitCode === 0) {
      const sha = await $.process.run(['git', '-C', cwd, 'rev-parse', '--short', 'HEAD'], { timeoutMs: 3000 })
      value = sha.exitCode === 0 ? `@${sha.stdout.trim()}` : undefined
    }
  } catch {
    value = undefined
  }
  branches.set(cwd, { value, at: Date.now() })
  return value
}

/** The project folder a transcript lives under: the cwd with every `/` and `.` turned into `-`. */

/**
 * The context window a model id counts against, as the engine's model table
 * has it: the Claude 5 family (fable, mythos, opus 4.7+, sonnet 5+) is 1M
 * natively, older models 200k unless spelled with `[1m]`.
 */
const windowFor = (model: string | undefined): number => {
  if (!model) return 200_000
  if (/\[1m\]/i.test(model)) return 1_000_000
  const m = model.match(/(fable|mythos|opus|sonnet|haiku)-(\d+)(?:-(\d+))?/i)
  if (!m) return 200_000
  const family = m[1]!.toLowerCase()
  const version = Number(m[2]) + Number(m[3] ?? 0) / 10
  if (family === 'fable' || family === 'mythos') return 1_000_000
  if (family === 'opus' && version >= 4.7) return 1_000_000
  if (family === 'sonnet' && version >= 5) return 1_000_000
  return 200_000
}

type Usage = {
  input_tokens?: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
}

/**
 * Context use of another session: the usage of its transcript's last assistant
 * message (input + cache read + cache creation = the context it was sent).
 *
 * A compaction moves the live transcript to a new file and leaves a
 * `continued-in` entry at the end of the old one, while `claude agents` keeps
 * the original session id: the chain is followed, a few hops at most.
 */
const contextOf = async ($: Engine, cwd: string, sessionId: string): Promise<FleetRow['context'] | undefined> => {
  if (!home) return undefined
  let id = sessionId
  for (let hop = 0; hop < 6; hop++) {
    const path = transcriptPath(home, cwd, id)
    const r = await $.process.run(['tail', '-c', '262144', path], { timeoutMs: 3000 }).catch(() => undefined)
    if (!r || r.exitCode !== 0) return undefined
    const lines = r.stdout.split('\n')
    let next: string | undefined
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i]!
      if (!line.includes('"usage"') && !line.includes('"continued-in"')) continue
      try {
        const o = JSON.parse(line) as {
          type?: string
          continuedInSessionId?: string
          message?: { model?: string; usage?: Usage }
        }
        if (o.type === 'continued-in' && typeof o.continuedInSessionId === 'string') {
          next = o.continuedInSessionId
          break
        }
        const u = o.type === 'assistant' ? o.message?.usage : undefined
        if (!u) continue
        const tokens = (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0)
        return {
          tokens,
          window: windowFor(o.message?.model),
          ...(o.message?.model ? { model: o.message.model } : {}),
        }
      } catch {
        // a cut first line, or a non-JSON line: keep looking
      }
    }
    if (!next || next === id) return undefined
    id = next
  }
  return undefined
}

/** What each transcript was read for pr-links: how far, what it found, and when. Module state: a reload reads again. */
const prLinks = new Map<string, { offset: number; urls: string[]; at: number }>()
const PR_LINK_EVERY_MS = 30_000

/**
 * The PRs Claude Code recorded in a session's transcript (its pr-link records, as the agent view's PR
 * labels and a background job's children come from): for a session whose cockpit keeps none, read
 * from where the last read stopped, at most every PR_LINK_EVERY_MS.
 */
const prLinksOf = async ($: Engine, cwd: string, sessionId: string): Promise<FleetLink[]> => {
  if (!home) return []
  const path = transcriptPath(home, cwd, sessionId)
  const seen = prLinks.get(path) ?? { offset: 0, urls: [], at: 0 }
  const now = Date.now()
  if (now - seen.at >= PR_LINK_EVERY_MS) {
    const r = await $.process.run(prLinkScan(path, seen.offset), { timeoutMs: 10_000 }).catch(() => undefined)
    if (r?.exitCode === 0) {
      const { size, links } = parsePrLinkScan(r.stdout)
      const urls = [...seen.urls, ...links.map(l => l.url).filter(u => !seen.urls.includes(u))]
      prLinks.set(path, { offset: size, urls, at: now })
      seen.urls = urls
    }
  }
  return [...new Set(seen.urls)].map(href => ({ id: href.split('/').at(-1) ?? href, href, kind: 'pr' }))
}

/** This session's own context, live from the engine. */
const ownContext = async ($: Engine): Promise<FleetRow['context'] | undefined> => {
  const [u, model] = await Promise.all([
    $.session.usage().catch(() => undefined),
    $.session.model().catch(() => undefined),
  ])
  if (!u) return undefined
  const tokens =
    u.context.tokens ??
    (u.context.percent !== undefined ? Math.round((u.context.percent / 100) * u.context.window) : undefined)
  return tokens === undefined ? undefined : { tokens, window: u.context.window, ...(model ? { model } : {}) }
}

/** `claude-fable-5-1` → `fable 5.1`; `fable[1m]` (as /model shows it) → `fable 1m`; anything else as is. */
const shortModel = (model: string): string => {
  const id = model.match(/^claude-([a-z]+)-(\d+)-(\d+)(?:-\d{8})?(?:\[(1m)\])?$/i)
  if (id) return `${id[1]} ${id[2]}.${id[3]}${id[4] ? ` ${id[4]}` : ''}`
  return model.replace(/\[(1m)\]/i, ' $1').replace(/\s+\(1M context\)$/i, ' 1m')
}

/** Where an interactive session runs, from its `~/.claude/sessions/<pid>.json`: a tmux pane, or another terminal. */
const whereOf = async ($: Engine, pid: number | undefined): Promise<string | undefined> => {
  if (!home || pid === undefined) return undefined
  try {
    const o = JSON.parse(await $.fs.read(`${home}/.claude/sessions/${pid}.json`)) as {
      tmux?: string
      entrypoint?: string
    }
    if (typeof o.tmux === 'string' && o.tmux) return `tmux ${o.tmux}`
    if (o.entrypoint === 'claude-vscode') return 'VS Code'
    if (o.entrypoint?.startsWith('claude-desktop')) return 'Claude Desktop'
    return 'another terminal'
  } catch {
    return undefined
  }
}

const readJob = async ($: Engine, id: string): Promise<JobState> => {
  if (!home) return {}
  try {
    const text = await $.fs.read(`${home}/.claude/jobs/${id}/state.json`)
    return JSON.parse(text) as JobState
  } catch {
    return {}
  }
}

const refresh = async ($: Engine): Promise<void> => {
  if (isRefreshing) {
    isRefreshQueued = true
    return
  }
  isRefreshing = true
  try {
    selfId ??= await $.session.id().catch(() => undefined)
    home ??= await $.env.get('HOME').catch(() => undefined)
    scope ??= await scopeDir($)
    const isAll = await read($, allRepos)
    const { exitCode, stdout, stderr } = await $.process.run(
      // --all: finished background jobs too; those are the ones /resume can open here.
      // --cwd narrows interactive and background sessions alike to this repo and its worktrees.
      ['claude', 'agents', '--json', '--all', ...(scope && !isAll ? ['--cwd', scope] : [])],
      { timeoutMs: 10_000 },
    )
    // The toggle flipped while this poll ran: its rows belong to the other scope.
    if ((await read($, allRepos)) !== isAll) return
    if (exitCode !== 0) {
      await update($, fleet, v => ({
        ...v,
        error: stderr.trim() || `claude agents exited ${exitCode}`,
      }))
      return
    }
    const parsed = JSON.parse(stdout) as AgentsJsonRow[]
    const rows: FleetRow[] = await Promise.all(
      parsed.map(async r => {
        const isSelf = r.sessionId === selfId
        const [job, branch, context, where, kept] = await Promise.all([
          r.kind === 'background' && r.id ? readJob($, r.id) : Promise.resolve({} as JobState),
          branchOf($, r.cwd),
          isSelf ? ownContext($) : contextOf($, r.cwd, r.sessionId),
          r.kind === 'interactive' && !isSelf ? whereOf($, r.pid) : Promise.resolve(undefined),
          // each session's cockpit keeps its references under its id (./references)
          $.store.get(`references:${r.sessionId}`).catch(() => undefined),
        ])
        const refs = Array.isArray(kept) ? (kept as Reference[]) : []
        // a session with no cockpit of its own: the PRs Claude Code recorded in its transcript
        const recorded = refs.length === 0 && r.kind === 'interactive' ? await prLinksOf($, r.cwd, r.sessionId) : []

        return {
          key: r.id ?? r.sessionId,
          sessionId: r.sessionId,
          name: r.name,
          cwd: r.cwd,
          ...(branch ? { branch } : {}),
          kind: r.kind,
          pid: r.pid,
          startedAt: r.startedAt,
          state: job.state ?? r.state,
          status: r.status,
          links: [
            ...(job.children ?? []).flatMap((c): FleetLink[] =>
              c.href ? [{ id: c.id ?? c.href, href: c.href, kind: c.kind ?? 'link' }] : [],
            ),
            ...recorded,
          ],
          ...(context ? { context } : {}),
          ...(where ? { where } : {}),
          ...(refs.length > 0 ? { refs } : {}),
          isSelf,
        }
      }),
    )
    await update($, fleet, () => ({ rows, refreshedAt: Date.now() }))
  } catch (err) {
    await update($, fleet, v => ({
      ...v,
      error: err instanceof Error ? err.message : String(err),
    }))
  } finally {
    isRefreshing = false
    if (isRefreshQueued) {
      isRefreshQueued = false
      void refresh($).then(() => $.ui.invalidate('ui.render'))
    }
  }
}

// ---- actions -----------------------------------------------------------------

const openLink = async ($: Engine, href: string) => {
  const r = await $.process.run(['open', href], { timeoutMs: 5000 }).catch(() => undefined)
  $.ui.toast(r?.exitCode === 0 ? `opened ${href}` : href)
}

const linkLabel = (link: FleetLink): string => (link.kind === 'pr' || link.kind === 'issue' ? `#${link.id}` : link.id)

// ---- presentation ------------------------------------------------------------

/** `glyph` marks the row; `long` is the state the meta line spells out when the group title does not already say it. */
type Tone = { glyph: string; color: string; long: string; rank: number }

// rank: 0 needs input, 1 running, 2 idle or in between, 3 finished.
const tone = (row: FleetRow): Tone => {
  if (row.kind === 'background') {
    switch (row.state) {
      case 'blocked':
        return { glyph: '!', color: 'error', long: 'needs input', rank: 0 }
      case 'working':
        return { glyph: '+', color: 'claude', long: 'working', rank: 1 }
      case 'starting':
      case 'resuming':
      case 'adopted':
      case 'running':
        return { glyph: '+', color: 'claude', long: row.state, rank: 1 }
      case 'crashed':
        return { glyph: '✗', color: 'error', long: 'crashed · restarting', rank: 2 }
      case 'done':
        return { glyph: '✓', color: 'success', long: 'done', rank: 3 }
      case 'failed':
        return { glyph: '✗', color: 'error', long: 'failed', rank: 3 }
      case 'stopped':
        return { glyph: '■', color: 'inactive', long: 'stopped', rank: 3 }
      default:
        return { glyph: '·', color: 'inactive', long: row.status ?? row.state ?? 'idle', rank: 2 }
    }
  }
  switch (row.status) {
    case 'waiting':
      return { glyph: '!', color: 'error', long: 'needs input', rank: 0 }
    case 'busy':
      return { glyph: '+', color: 'claude', long: 'busy', rank: 1 }
    case 'shell':
      return { glyph: '+', color: 'claude', long: 'running a command', rank: 1 }
    default:
      return { glyph: '·', color: 'inactive', long: row.status ?? 'idle', rank: 2 }
  }
}

const elapsed = (startedAt: number, now: number): string => {
  const s = Math.max(0, Math.round((now - startedAt) / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h${String(m % 60).padStart(2, '0')}` : `${Math.floor(h / 24)}d`
}

// The context bar is the usage band's bar (./bar): a Raster track on the terminal, an SVG one on the desktop.

/** Terminal: `cells` wide, filled to 1/8 of a cell. */
const barRaster = (pct: number, cells: number) => ({ cells: packCells(barCells(pct, cells, level(pct))), columns: cells })

const LINK_BLUE = '#60A5FA'

// ---- the app's look (a desktop surface draws borders, fills and gaps the terminal's grid does not) ----

/** A session's card: a faint fill, a rounded edge that brightens under the pointer, this session's in blue. */
const CARD = { fill: '#1F2430', edge: '#2F3746', hover: '#64748B', self: LINK_BLUE }
/** A reference's chip, its fill by where it stands. */
const CHIP: Record<RefTone, string> = {
  active: '#1F3A2C',
  merged: '#2D2547',
  idle: '#2A303B',
  link: '#1D3044',
  unsure: '#2A303B',
}
/** What a card's border and padding take of the pane's width. */
const CARD_CELLS = 4
// a session's block under the pointer: a slate a step above the terminal's dark, apart from this session's own grey
const BLOCK_HOVER = '#2B3445'

const PX_PER_CELL = 7.9 // monospace advance at 13px, as the band's

/** Desktop: the same rounded track, 14px tall. */
const barSvg = (pct: number, cells: number): { svg: string; w: number } => {
  const w = Math.round(cells * PX_PER_CELL)
  return {
    w,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="14" viewBox="0 0 ${w} 14"><style>:root{color-scheme:light dark;background:transparent}</style>${barRects(0, 4.5, w, pct, level(pct))}</svg>`,
  }
}

const dir = (cwd: string): string => cwd.split('/').filter(Boolean).at(-1) ?? cwd

/** The repo a session runs in, by name: a worktree under `.claude/worktrees/` counts as its parent repo. */
const repoName = (cwd: string): string => dir(cwd.split('/.claude/worktrees/')[0] ?? cwd)

/** Flips between this repo's sessions and every session, then polls at once. */
const toggleScope = async ($: Engine) => {
  await update($, allRepos, v => !v)
  await update($, fleet, v => ({ ...v, rows: [], refreshedAt: 0 }))
  $.ui.invalidate('ui.render')
  await refresh($)
  $.ui.invalidate('ui.render')
}

// ---- hooks -------------------------------------------------------------------

export const registerSessions: Register = on => {
  // The poll's invalidate redraws every instance this plugin draws, so it also keeps the usage band's
  // reset countdowns moving.
  on('session.start', async ($, e, next) => {
    await ensureCommand($)
    void $.ui.open({ id: PANE, title: TITLE })
    void refresh($)

    $.clock.every(POLL_MS, async () => {
      await refresh($)
      $.ui.invalidate('ui.render')
    })

    return next(e)
  })


  // A hot load may miss session.start: the first prompt registers the command
  // and opens the pane as a person-driven open (any width).
  on('prompt.submit', async ($, e, next) => {
    await ensureCommand($)
    void $.ui.open({ id: PANE, title: TITLE })

    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'sessions-view' }, async ($, e) => {
    await openSized($, e.presentation.columns, true)
    await refresh($)

    return { text: 'Sessions pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    // First draw: size the dock to a fifth of the terminal (an unasked open has no width to ask with).
    if (!isSized && e.props.placement === 'dock') void openSized($, e.viewport?.columns)
    const els = $.ui.resolve(e)
    const { Box, Button, Text } = els
    // The terminal's table carries an Svg it never draws, so ask the surface, not the table.
    const Svg = e.surface !== 'terminal' && 'Svg' in els ? els.Svg : undefined
    const Raster = 'Raster' in els ? els.Raster : undefined
    const view = await read($, fleet)
    const isAll = await read($, allRepos)
    const now = Date.now()
    // the app draws cards and chips, and needs no title of its own: its pane's frame names it
    const isApp = e.surface !== 'terminal'
    const width = Math.max(10, e.props.bodyColumns - (isApp ? CARD_CELLS : 0))
    const sorted = [...view.rows].sort((a, b) => tone(a).rank - tone(b).rank || b.startedAt - a.startedAt)
    const count = (rank: number) => sorted.filter(r => tone(r).rank === rank).length
    const tally = [
      { n: count(0), glyph: '!', color: 'error', label: 'needs you' },
      { n: count(1), glyph: '+', color: 'claude', label: 'running' },
      { n: count(2), glyph: '·', color: 'inactive', label: 'idle' },
      { n: count(3), glyph: '✓', color: 'success', label: 'done' },
    ].filter(c => c.n > 0)
    const empty =
      view.error ?? (view.refreshedAt === 0 ? 'Loading…' : isAll ? 'No sessions.' : 'No sessions in this repo.')
    const scopeLabel = isAll ? '[all]' : '[repo]'
    const nameCells = Math.max(4, width - LABEL_CELLS)
    const groups = ['needs input', 'running', 'idle', 'finished'] as const

    // Scope toggle: this repo's sessions, or every session on the machine.
    const scope = <Button key="scope" plain dimColor label={scopeLabel} onPress={() => void toggleScope($)} />

    // The tally, one colored count per state that has any: the only one in the pane.
    const counts = (
      <Text wrap="truncate-end">
        {/* Two spaces between counts: idle's own glyph is a `·`, so a `·` separator would double it. */}
        {tally.map((c, i) => (
          <Text key={c.label}>
            {i > 0 ? '  ' : null}
            <Text color={c.color}>{`${c.glyph} ${c.n} ${c.label}`}</Text>
          </Text>
        ))}
      </Text>
    )

    let group: string | undefined
    return (
      <Box flexDirection="column">
        {/* At the top: the app's frame names the pane, so its tally sits beside the scope toggle; the */}
        {/* terminal (which draws no frame title for a lone pane) keeps its title there and the tally below. */}
        {isApp ? (
          <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
            {counts}
            {scope}
          </Box>
        ) : (
          <Box flexDirection="column" marginBottom={tally.length > 0 ? 1 : 0}>
            <Box flexDirection="row" justifyContent="space-between">
              <Text bold>{fit(TITLE, Math.max(0, width - scopeLabel.length - 1))}</Text>
              {scope}
            </Box>
            {tally.length > 0 ? counts : null}
          </Box>
        )}
        {sorted.length === 0 && <Text dimColor>{empty}</Text>}
        {sorted.map(row => {
          const t = tone(row)
          const line = (text: string) => fit(text, width)
          const pct =
            row.context && row.context.window > 0
              ? Math.max(0, Math.min(100, Math.round((row.context.tokens / row.context.window) * 100)))
              : undefined
          const model = row.context?.model ? shortModel(row.context.model) : undefined
          const title = groups[t.rank] ?? 'idle'
          const meta = `   ${t.long === title ? '' : `${t.long} · `}${isAll && row.branch ? `${repoName(row.cwd)} · ` : ''}${row.branch ?? dir(row.cwd)} · ${elapsed(row.startedAt, now)}${row.kind === 'background' ? ' · bg' : ''}${row.where ? ` · ${row.where}` : ''}${row.isSelf ? ' · you' : ''}`
          const trackCells = Math.max(6, Math.min(BAR_CELLS, width - 3 - (model ? cells(model) + 1 : 0)))
          // the surface's own picture leaf, chosen once; none on a surface that has neither
          let track = null
          if (pct !== undefined && Svg) {
            const b = barSvg(pct, trackCells)
            track = <Svg source={b.svg} alt={`context ${pct}%`} width={b.w} height={14} />
          } else if (pct !== undefined && Raster) {
            const b = barRaster(pct, trackCells)
            track = <Raster key={`ctx:${row.key}`} columns={b.columns} rows={1} cells={b.cells} />
          }
          // what Claude Code recorded (a job's state.json children, a transcript's pr-links) joins the
          // references the session's cockpit kept, drawn the same with no status
          const refs: Reference[] = [
            ...(row.refs ?? []),
            ...row.links
              .filter(l => !row.refs?.some(r => r.url === l.href))
              .map(l => ({ ...refOfUrl(l.href, linkLabel(l)), at: 0 })),
          ]
          const isNewGroup = title !== group
          group = title
          const self = row.isSelf
          return (
            <Box
              key={row.key}
              flexDirection="column"
              marginTop={isNewGroup && t.rank !== tone(sorted[0]!).rank ? 1 : 0}
            >
              {isNewGroup ? (
                <Text dimColor bold>
                  {fit(title.toUpperCase(), width)}
                </Text>
              ) : null}
              {/* A session is not pressed: under the pointer its block lights, to show which lines are its; */}
              {/* only its references open. This session's block sits on the theme's own-message background; */}
              {/* in the app each is a card, its edge brightening under the pointer, this session's blue. */}
              <Box
                key={`block:${row.key}`}
                flexDirection="column"
                {...(isApp
                  ? {
                      borderStyle: 'round',
                      borderColor: self ? CARD.self : CARD.edge,
                      backgroundColor: CARD.fill,
                      paddingX: 1,
                      marginBottom: 1,
                      hover: { borderColor: self ? CARD.self : CARD.hover },
                    }
                  : {
                      hover: { backgroundColor: BLOCK_HOVER },
                      ...(self ? { backgroundColor: 'userMessageBackground' } : {}),
                    })}
              >
                <Box flexDirection="row">
                  <Text color={t.color}>{pad(t.glyph, LABEL_CELLS)}</Text>
                  <Text>{fit(row.name, nameCells)}</Text>
                </Box>
                <Text dimColor wrap="truncate-end">
                  {line(meta)}
                </Text>
                {/* Context use, the same bar as the usage band's 5h / 7d. */}
                {track && (
                  <Box flexDirection="row" alignItems="center">
                    <Text dimColor>{`   ${model ? `${model} ` : ''}`}</Text>
                    {track}
                  </Box>
                )}
                {/* The session's references: each its id, a Button that opens it, dim once finished, then its mark. */}
                {/* Indented by spaces as the meta and model lines are, so they line up on a proportional font too. */}
                {refs.length > 0 ? (
                  <Box flexDirection="row">
                    <Text>{' '.repeat(LABEL_CELLS)}</Text>
                    <Box flexDirection="row" flexWrap="wrap" columnGap={isApp ? 1 : 2} rowGap={isApp ? 1 : 0}>
                    {refs.map(r => {
                      const look = refLook(r)
                      return (
                        // in the app a chip, tinted by where it stands
                        <Box
                          key={`ref:${row.key}:${r.url}`}
                          flexDirection="row"
                          {...(isApp ? { backgroundColor: CHIP[look.tone], paddingX: 1 } : {})}
                        >
                          <Button
                            key={`ref:${row.key}:${r.url}:open`}
                            plain
                            label={look.label}
                            {...(look.dim ? { dimColor: true } : {})}
                            // under the pointer it reads as a link: blue and underlined, not the row's inverse
                            hover={{ color: LINK_BLUE, underline: true, inverse: false }}
                            onPress={() => void openLink($, r.url)}
                          />
                          {look.mark ? <Text color={look.mark[1]}>{look.mark[0]}</Text> : null}
                        </Box>
                      )
                    })}
                    </Box>
                  </Box>
                ) : null}
              </Box>
            </Box>
          )
        })}
      </Box>
    )
  })
}
