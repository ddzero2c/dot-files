import { atom, read, update } from 'claude-code'
import type { EngineInterface as Engine, Register, RenderSurface } from 'claude-code'

import type { FleetLink, FleetRow, FleetView } from '../types'
import { fit } from './text'

const PANE = 'sessions-view'
const TITLE = 'Sessions'
const POLL_MS = 2000
/** The docked pane's opening width, as a share of the terminal. */
const DOCK_SHARE = 0.2
const DOCK_MIN_COLUMNS = 28
const BAR_CELLS = 20

const fleet = atom({ plugin: 'sessions-view', key: 'fleet' } as const, {
  rows: [],
  refreshedAt: 0,
} satisfies FleetView)

/** Whether the list shows every session on this machine instead of only this repo's. Kept across hot reloads. */
const allRepos = atom({ plugin: 'sessions-view', key: 'allRepos' } as const, false)

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
  needs?: string | null
  detail?: string | null
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
const projectSlug = (cwd: string): string => cwd.replace(/[/.]/g, '-')

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
    const path = `${home}/.claude/projects/${projectSlug(cwd)}/${id}.jsonl`
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
        const [job, branch, context, where] = await Promise.all([
          r.kind === 'background' && r.id ? readJob($, r.id) : Promise.resolve({} as JobState),
          branchOf($, r.cwd),
          isSelf ? ownContext($) : contextOf($, r.cwd, r.sessionId),
          r.kind === 'interactive' && !isSelf ? whereOf($, r.pid) : Promise.resolve(undefined),
        ])
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
          needs: job.needs ?? undefined,
          detail: job.detail ?? undefined,
          links: (job.children ?? []).flatMap((c): FleetLink[] =>
            c.href ? [{ id: c.id ?? c.href, href: c.href, kind: c.kind ?? 'link' }] : [],
          ),
          ...(context ? { context } : {}),
          ...(where ? { where } : {}),
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

/** The command that opens a session elsewhere: `claude attach` for a background job, `--resume` otherwise. */
const commandFor = (row: FleetRow): string =>
  row.kind === 'background' ? `claude attach ${row.key}` : `claude --resume ${row.sessionId}`

/** A session whose process is alive somewhere: the engine refuses to resume those from a second place. */
const isLiveElsewhere = (row: FleetRow): boolean =>
  row.kind === 'interactive' ||
  row.pid !== undefined ||
  row.status !== undefined ||
  !['done', 'failed', 'stopped'].includes(row.state ?? '')

/**
 * Enter / click on a row. A finished session is opened right here through the
 * built-in `/resume <id>`, as the agents view's Enter does; one still running
 * elsewhere cannot be (the engine refuses: "already open in another running
 * Claude session"), so the command that opens it is copied instead.
 */
const activate = async ($: Engine, row: FleetRow, surface: RenderSurface) => {
  if (row.isSelf) {
    $.ui.toast('this session')
    return
  }
  if (!isLiveElsewhere(row)) {
    $.ui.toast(`resuming ${row.name}…`)
    try {
      await $.command.run({ command: 'resume', args: row.sessionId })
      return
    } catch (err) {
      $.ui.toast(`resume failed: ${err instanceof Error ? err.message : String(err)}`, { timeoutMs: 6000 })
    }
  }
  const cmd = commandFor(row)
  const copied = await $.ui.copy({ text: cmd, surface }).catch(() => ({ isCopied: false as const }))
  const where = row.where ? ` · running in ${row.where}` : row.kind === 'background' ? ' · still running' : ''
  $.ui.toast(copied.isCopied ? `copied: ${cmd}${where}` : `${cmd}${where}`, {
    timeoutMs: 6000,
  })
}

const isWorktree = (cwd: string): boolean => cwd.includes('/.claude/worktrees/')

const firstLine = (text: string): string => text.trim().split('\n')[0] ?? ''

/** The row whose ✗ was pressed and awaits a Yes; the one being removed. Module state: a reload clears it. */
let pendingKey: string | undefined
let busyKey: string | undefined

const setPending = ($: Engine, key: string | undefined) => {
  pendingKey = key
  $.ui.invalidate('ui.render')
}

/**
 * Removes a session after its Yes. A background job goes through `claude rm`,
 * which deletes the job and its worktree when that is safe. An interactive
 * session's process is asked to exit, then its worktree (when it runs in one)
 * is removed; git refuses a dirty one and the refusal is shown.
 */
const remove = async ($: Engine, row: FleetRow) => {
  pendingKey = undefined
  busyKey = row.key
  $.ui.invalidate('ui.render')
  const fail = (text: string) => $.ui.toast(`remove ${row.name} failed: ${text}`, { timeoutMs: 8000 })
  try {
    if (row.kind === 'background') {
      const r = await $.process.run(['claude', 'rm', row.key], {
        timeoutMs: 120_000,
      })
      if (r.exitCode === 0) $.ui.toast(`removed ${row.name}${isWorktree(row.cwd) ? ' + worktree' : ''}`)
      else fail(firstLine(r.stderr || r.stdout) || `claude rm exited ${r.exitCode}`)
    } else {
      if (row.pid !== undefined) {
        const k = await $.process.run(['kill', '-TERM', String(row.pid)], {
          timeoutMs: 5000,
        })
        if (k.exitCode !== 0) {
          fail(firstLine(k.stderr) || `kill exited ${k.exitCode}`)
          return
        }
      }
      if (isWorktree(row.cwd)) {
        const w = await $.process.run(['git', '-C', row.cwd, 'worktree', 'remove', row.cwd], { timeoutMs: 30_000 })
        if (w.exitCode === 0) $.ui.toast(`closed ${row.name} + removed worktree`)
        else fail(`session closed, worktree kept: ${firstLine(w.stderr) || `git exited ${w.exitCode}`}`)
      } else {
        $.ui.toast(`closed ${row.name}`)
      }
    }
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  } finally {
    busyKey = undefined
    branches.delete(row.cwd)
    await refresh($)
    $.ui.invalidate('ui.render')
  }
}

const openLink = async ($: Engine, href: string) => {
  const r = await $.process.run(['open', href], { timeoutMs: 5000 }).catch(() => undefined)
  $.ui.toast(r?.exitCode === 0 ? `opened ${href}` : href)
}

const linkLabel = (link: FleetLink): string => (link.kind === 'pr' || link.kind === 'issue' ? `#${link.id}` : link.id)

// ---- presentation ------------------------------------------------------------

type Tone = { glyph: string; color: string; label: string; rank: number }

// rank: 0 needs input, 1 running, 2 idle or in between, 3 finished.
const tone = (row: FleetRow): Tone => {
  if (row.kind === 'background') {
    switch (row.state) {
      case 'blocked':
        return { glyph: '◆', color: 'magenta', label: 'needs input', rank: 0 }
      case 'working':
        return { glyph: '●', color: 'yellow', label: 'working', rank: 1 }
      case 'starting':
      case 'resuming':
      case 'adopted':
      case 'running':
        return { glyph: '◌', color: 'yellow', label: row.state, rank: 1 }
      case 'crashed':
        return {
          glyph: '✗',
          color: 'red',
          label: 'crashed · restarting',
          rank: 2,
        }
      case 'done':
        return { glyph: '✓', color: 'green', label: 'done', rank: 3 }
      case 'failed':
        return { glyph: '✗', color: 'red', label: 'failed', rank: 3 }
      case 'stopped':
        return { glyph: '■', color: 'gray', label: 'stopped', rank: 3 }
      default:
        return {
          glyph: '○',
          color: 'gray',
          label: row.status ?? row.state ?? 'idle',
          rank: 2,
        }
    }
  }
  switch (row.status) {
    case 'waiting':
      return { glyph: '◆', color: 'magenta', label: 'needs input', rank: 0 }
    case 'busy':
      return { glyph: '●', color: 'yellow', label: 'busy', rank: 1 }
    case 'shell':
      return {
        glyph: '●',
        color: 'yellow',
        label: 'running a command',
        rank: 1,
      }
    default:
      return {
        glyph: '○',
        color: 'gray',
        label: row.status ?? 'idle',
        rank: 2,
      }
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

const oneLine = (text: string, max: number): string => {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

// ---- hooks -------------------------------------------------------------------

export const register: Register = on => {
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
    const { Box, Button, Markdown, Text } = $.ui.resolve(e)
    const view = await read($, fleet)
    const isAll = await read($, allRepos)
    const now = Date.now()
    const width = Math.max(10, e.props.bodyColumns)
    const sorted = [...view.rows].sort((a, b) => tone(a).rank - tone(b).rank || b.startedAt - a.startedAt)
    const blocked = sorted.filter(r => tone(r).rank === 0).length
    const active = sorted.filter(r => tone(r).rank === 1).length
    const summary =
      `${sorted.length} sessions` +
      (active > 0 ? ` · ${active} active` : '') +
      (blocked > 0 ? ` · ${blocked} need input` : '')
    const empty =
      view.error ?? (view.refreshedAt === 0 ? 'Loading…' : isAll ? 'No sessions.' : 'No sessions in this repo.')
    const scopeLabel = isAll ? '[all]' : '[repo]'
    const groups = ['needs input', 'running', 'idle', 'finished'] as const

    let group: string | undefined
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold>
            {fit('Sessions ', width)}
            <Text dimColor>{fit(summary, Math.max(0, width - 9 - scopeLabel.length - 1))}</Text>
          </Text>
          {/* Scope toggle: this repo's sessions, or every session on the machine. */}
          <Button key="scope" plain dimColor label={scopeLabel} onPress={() => void toggleScope($)} />
        </Box>
        {sorted.length === 0 && <Text dimColor>{empty}</Text>}
        {sorted.map(row => {
          const t = tone(row)
          const title = groups[t.rank] ?? 'idle'
          const isNewGroup = title !== group
          group = title
          const note = t.rank === 0 ? row.needs : t.rank === 1 ? row.detail : undefined
          const line = (text: string) => fit(text, width)
          const meta = `   ${t.label} · ${isAll && row.branch ? `${repoName(row.cwd)} · ` : ''}${row.branch ?? dir(row.cwd)} · ${elapsed(row.startedAt, now)}${row.kind === 'background' ? ' · bg' : ''}${row.where ? ` · ${row.where}` : ''}${row.isSelf ? ' · you' : ''}`
          const pct =
            row.context && row.context.window > 0
              ? Math.max(0, Math.min(100, Math.round((row.context.tokens / row.context.window) * 100)))
              : undefined
          const model = row.context?.model ? shortModel(row.context.model) : undefined
          const filled = pct === undefined ? 0 : Math.round((pct / 100) * BAR_CELLS)
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
              {/* The row's name is a Button: the pane's focus ring walks these (↑/↓ per keybindings), Enter or a click acts. */}
              {/* This session's block sits on the theme's own-message background; text keeps its colors. */}
              <Box flexDirection="column" {...(self ? { backgroundColor: 'userMessageBackground' } : {})}>
                <Box flexDirection="row" justifyContent="space-between">
                  <Box flexDirection="row">
                    <Text color={t.color}> {t.glyph} </Text>
                    <Button
                      key={`row:${row.key}`}
                      plain
                      label={fit(row.name, Math.max(4, width - 6))}
                      {...(self ? { autoFocus: true as const } : {})}
                      onPress={press => void activate($, row, press.surface)}
                    />
                  </Box>
                  {/* ✗ at the row's right edge: a press asks first; this session has none. */}
                  {row.isSelf ? null : busyKey === row.key ? (
                    <Text color="yellow">… </Text>
                  ) : pendingKey === row.key ? (
                    <Text color="red">? </Text>
                  ) : (
                    <Button key={`rm:${row.key}`} plain dimColor label="✗ " onPress={() => setPending($, row.key)} />
                  )}
                </Box>
                {pendingKey === row.key ? (
                  <Box flexDirection="row" gap={1}>
                    <Text color="red" wrap="truncate-end">
                      {`   ${row.kind === 'background' ? 'remove' : 'close'}${isWorktree(row.cwd) ? ' + worktree' : ''}?`}
                    </Text>
                    <Button key={`yes:${row.key}`} variant="primary" label="Yes" onPress={() => void remove($, row)} />
                    <Button key={`no:${row.key}`} label="Cancel" onPress={() => setPending($, undefined)} />
                  </Box>
                ) : (
                  <Text dimColor wrap="truncate-end">
                    {line(busyKey === row.key ? `${meta} · removing…` : meta)}
                  </Text>
                )}
                {pct !== undefined ? (
                  <Text wrap="truncate-end">
                    {'   '}
                    <Text dimColor>{model ? `${model} ` : ''}</Text>
                    <Text color={pct >= 80 ? 'red' : pct >= 50 ? 'yellow' : 'green'}>{'█'.repeat(filled)}</Text>
                    <Text dimColor>{'░'.repeat(BAR_CELLS - filled)}</Text>
                  </Text>
                ) : null}
                {row.links.length > 0 ? (
                  <Box flexDirection="row">
                    <Text>{'   '}</Text>
                    {/* Markdown draws these in the reply's link style; a click comes back here to open the browser. */}
                    <Markdown
                      key={`links:${row.key}`}
                      text={row.links.map(l => `[${linkLabel(l)}](${l.href})`).join(' ')}
                      pressableLinks={row.links.map(l => l.href)}
                      onLinkPress={link => void openLink($, link.href)}
                    />
                  </Box>
                ) : null}
                {note ? (
                  <Text color={t.rank === 0 ? 'magenta' : undefined} dimColor={t.rank !== 0} wrap="truncate-end">
                    {line(`   ${oneLine(note, 400)}`)}
                  </Text>
                ) : null}
              </Box>
            </Box>
          )
        })}
      </Box>
    )
  })
}
