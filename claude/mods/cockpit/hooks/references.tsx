import { atom, read, update } from 'claude-code'
import type { EngineInterface as Engine, Register } from 'claude-code'

import type { RefJudge, Reference, RefStatus } from '../types'
import { parsePrLinkScan, prLinkScan, transcriptPath } from './transcript'

// The session's references: its PRs (the pr-link records Claude Code itself writes, as the agent view's
// PR labels come from), what its connector calls read or wrote that a small model judged it works on,
// and the current branch's PR and issue. Kept per session in $.store, so a resume shows them again and
// the Sessions pane shows every session's; PRs and issues get their live status every minute.

export const references = atom({ plugin: 'cockpit', key: 'references' } as const, [] as Reference[])

const REFRESH_MS = 60_000
// a session that predates the mod brings only its last few connector calls to the judge
const BACKFILL = 30

// A connector call counts when it reads one thing or writes: not a search or a listing, whose links are
// many and passing. A write is what its server does not declare read-only; where that is not known (the
// backfill reads the transcript), a write verb decides.
const LISTING = /^(?:slack_)?(?:list|search|query|find)_/
const READ_ONE = /^(?:slack_)?(?:get|read|view|fetch)_/
const WRITE = /^(?:slack_)?(?:save|create|update|send|reply|forward|share|merge|submit|schedule)_/
const PR_URL = /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/
const LINEAR_URL = /https:\/\/linear\.app\/[\w-]+\/issue\/[A-Z][A-Z0-9]*-\d+/
const ANY_URL = /https:\/\/[^\s"'<>)\]}`]+/g
const ISSUE_KEY = /\b[A-Z][A-Z0-9]{1,9}-\d+\b/
// a Linear key in a branch name: `ryder/koc-2124-myship-return-info`
const BRANCH_KEY = /(?:^|[/_-])([a-z][a-z0-9]{1,9}-\d+)(?=$|[-_/])/i

const SERVICES: [RegExp, string][] = [
  [/(^|\.)slack\.com$/, 'slack'],
  [/^mail\.google\.com$/, 'gmail'],
  [/^docs\.google\.com$/, 'docs'],
  [/^drive\.google\.com$/, 'drive'],
  [/^calendar\.google\.com$/, 'calendar'],
  [/^github\.com$/, 'github'],
  [/^linear\.app$/, 'linear'],
]

type Ref = Omit<Reference, 'at'>

const prRef = (url: string): Ref => ({ url, kind: 'pr', service: 'github', label: `#${url.split('/').at(-1)}` })

const issueRef = (url: string): Ref => {
  const key = url.split('/issue/')[1]!.split('/')[0]!
  return { url: url.slice(0, url.indexOf(key) + key.length), kind: 'issue', service: 'linear', label: key }
}

const serviceOf = (url: string) => {
  const host = new URL(url).hostname.replace(/^www\./, '')
  return SERVICES.find(([re]) => re.test(host))?.[1] ?? host
}

/** Any link as a reference with no status yet: a PR by its number, an issue by its key, else `label`. */
export const refOfUrl = (url: string, label: string): Ref =>
  PR_URL.test(url) ? prRef(url) : LINEAR_URL.test(url) ? issueRef(url) : { url, kind: 'link', service: serviceOf(url), label }

const SLACK_ARCHIVE = /https:\/\/((?:[\w-]+\.)?slack\.com)\/archives\/(\w+)\/p(\d{10})(\d{6})(?:\?[^\s"'<>)\]}`]*)?/

/**
 * A Slack call's thread, as one link: its first message's (`…/archives/C1/p1700000000000100`). A reply's
 * root is the `thread_ts` its link or its call names, a thread read's the `message_ts` it asked for, a
 * message's itself; so a thread is one reference however many times it was read or written to. The
 * workspace comes from any Slack link in the result.
 */
const slackThread = (input: Record<string, unknown>, text: string): string | undefined => {
  const m = text.match(SLACK_ARCHIVE)
  const host = m?.[1] ?? 'slack.com'
  const channel = typeof input.channel_id === 'string' && input.channel_id ? input.channel_id : m?.[2]
  const fromLink = m?.[0].match(/[?&]thread_ts=(\d+\.\d+)/)?.[1] ?? (m ? `${m[3]}.${m[4]}` : undefined)
  const str = (v: unknown) => (typeof v === 'string' && /^\d+\.\d+$/.test(v) ? v : undefined)
  const root = m?.[0].includes('thread_ts=') ? fromLink : str(input.thread_ts) ?? str(input.message_ts) ?? fromLink
  return channel && root ? `https://${host}/archives/${channel}/p${root.replace('.', '')}` : undefined
}

/** A Linear issue known only by its key, until its url is looked up. */
type IssueKey = { issue: string }

/** A connector call's reference, waiting for the judge at the turn's end. */
export type Candidate = { ref: Ref | IssueKey } & RefJudge

/**
 * What one finished connector call puts to the judge: the thing it read or wrote, by the link its
 * result holds (a Linear issue's own first; never a PR, which Claude Code records itself), or for a
 * Linear call with no link, by its key. A Slack link is named by its channel's id. `isReadOnly` is the
 * engine's word for the call, undefined where it is not known. Pure, for the live hook and the backfill.
 */
export const findInCall = (tool: string, input: Record<string, unknown>, text: string, isReadOnly?: boolean): Candidate[] => {
  if (!tool.startsWith('mcp__')) return []
  const [, server = '', name = ''] = tool.split('__')
  if (LISTING.test(name)) return []
  const writes = isReadOnly === undefined ? WRITE.test(name) : !isReadOnly
  const op = READ_ONE.test(name) ? 'read' : writes ? 'write' : undefined
  if (!op) return []
  const snippet = text.slice(0, 300)
  const linear = server.endsWith('Linear')
  const url =
    (server.endsWith('Slack') ? slackThread(input, text) : undefined) ??
    (linear ? text.match(LINEAR_URL)?.[0] : undefined) ??
    [...text.matchAll(ANY_URL)].map(m => m[0]).find(u => !PR_URL.test(u))
  if (url) {
    const channel = typeof input.channel_id === 'string' && input.channel_id ? input.channel_id : undefined
    return [{ ref: refOfUrl(url, channel ?? serviceOf(url)), tool, op, snippet }]
  }
  const key = linear ? (text.match(ISSUE_KEY) ?? String(input.id ?? input.issueId ?? '').match(ISSUE_KEY))?.[0] : undefined
  return key ? [{ ref: { issue: key }, tool, op, snippet }] : []
}

/**
 * Newest last, one per url; a touched reference moves to the end. It stays unsure only
 * while every word on it was: one kept, or a pr-link, is enough.
 */
const merge = (refs: Reference[], found: Reference[]): Reference[] => {
  let out = refs
  for (const f of found) {
    const old = out.find(r => r.url === f.url)
    const { judge: _, ...both } = { ...old, ...f }
    const judge = f.judge && (!old || old.judge) ? f.judge : undefined
    out = [...out.filter(r => r.url !== f.url), { ...both, ...(judge ? { judge } : {}) }]
  }
  return out
}

const json = (s: string): unknown => {
  try {
    return JSON.parse(s)
  } catch {
    return undefined
  }
}

type PrView = {
  url: string
  number: number
  title: string
  state: 'OPEN' | 'MERGED' | 'CLOSED'
  isDraft: boolean
  statusCheckRollup?: { conclusion?: string; status?: string; state?: string }[]
}

const PR_FIELDS = 'url,number,title,state,isDraft,statusCheckRollup'
const FAILED = ['FAILURE', 'ERROR', 'CANCELLED', 'TIMED_OUT', 'ACTION_REQUIRED']

const prStatus = (v: PrView): RefStatus => {
  const runs = v.statusCheckRollup ?? []
  const checks =
    runs.length === 0 ? undefined
    : runs.some(r => FAILED.includes((r.conclusion || r.state || '').toUpperCase())) ? 'fail'
    : runs.some(r => (r.status ?? 'COMPLETED').toUpperCase() !== 'COMPLETED' || ['PENDING', 'EXPECTED'].includes((r.state ?? '').toUpperCase())) ? 'pending'
    : 'pass'
  const state = v.state === 'MERGED' ? 'merged' : v.state === 'CLOSED' ? 'closed' : v.isDraft ? 'draft' : 'open'
  return { state, text: state, ...(checks ? { checks } : {}) }
}

type IssueView = { url?: string; identifier?: string; id?: string; title?: string; status?: string; statusType?: string }

const issueStatus = (v: IssueView): RefStatus | undefined => {
  if (!v.status) return undefined
  const t = (v.statusType ?? '').toLowerCase()
  const state = t === 'completed' ? 'done' : t === 'canceled' ? 'canceled' : t === 'started' ? 'started' : 'todo'
  return { state, text: v.status }
}

// ---- the judge: at a turn's end, which of what the session touched is what it works on ----

type Verdict = 'keep' | 'drop' | 'unsure'

const JUDGE_SYSTEM =
  'You decide which things a Claude Code session touched through its connectors are what it is working ' +
  'on, for the user to keep pinned beside the session.'

/**
 * Asks a small model, once for the turn, about every item: the turn's new ones and those it was unsure
 * of before. An item it does not answer, or every item when the call fails, is unsure.
 */
const ask = async ($: Engine, reply: string, items: { label: string; url: string; judge: RefJudge }[]): Promise<Verdict[]> => {
  const prompt =
    `The assistant's reply this turn:\n<reply>\n${reply.slice(0, 3000)}\n</reply>\n\n` +
    `Things its connector tools read or wrote:\n` +
    items.map((it, i) => `${i}. [${it.judge.op}] ${it.judge.tool}: ${it.label} ${it.url}\n   result: ${it.judge.snippet.replace(/\s+/g, ' ')}`).join('\n') +
    `\n\nFor each, answer keep (the session works on it, or produced it for its task), drop (looked up in ` +
    `passing, or unrelated) or unsure (cannot tell yet). Reply with only JSON: {"keep":[0],"drop":[1],"unsure":[2]}.`
  const r = await $.model.complete({ model: 'haiku', system: JUDGE_SYSTEM, prompt, effort: 'low', maxTokens: 200, timeoutMs: 8000 }).catch(() => undefined)
  const o = r?.isAnswered ? (json(r.text.match(/\{[\s\S]*\}/)?.[0] ?? '') as Partial<Record<Verdict, unknown>> | undefined) : undefined
  const has = (v: Verdict, i: number) => Array.isArray(o?.[v]) && (o[v] as unknown[]).includes(i)
  return items.map((_, i): Verdict => (has('drop', i) ? 'drop' : has('keep', i) ? 'keep' : 'unsure'))
}

// ---- I/O: all of it runs on the clock, after the call that found a reference has answered ----

const gh = async ($: Engine, args: string[], cwd: string) => {
  const r = await $.process.run(['gh', ...args], { cwd, timeoutMs: 15_000 }).catch(() => undefined)
  return r?.exitCode === 0 ? r.stdout : undefined
}

const viewPr = async ($: Engine, ref: string | undefined, cwd: string) => {
  const out = await gh($, ['pr', 'view', ...(ref ? [ref] : []), '--json', PR_FIELDS], cwd)
  const v = out === undefined ? undefined : (json(out) as PrView | undefined)
  return v?.url ? v : undefined
}

const viewIssue = async ($: Engine, key: string) => {
  const fields = ['id', 'title', 'url', 'status', 'statusType']
  const r = await $.mcp.call('claude.ai Linear', 'get_issue', { id: key, fields }).catch(() => undefined)
  if (!r || r.isError) return undefined
  const block = r.content.find(b => b.type === 'text')
  const v = block && 'text' in block ? (json(block.text) as IssueView | undefined) : undefined
  return v && (v.identifier || v.id) ? v : undefined
}

/**
 * Module state, which a reload clears: references waiting to be stored (a Linear key waiting for its
 * url too), this turn's candidates waiting for its end, and how far this session's transcript was read
 * for pr-links (a reload reads it again from the start, the store dropping what it already holds).
 */
let pending: (Reference | (IssueKey & { judge?: RefJudge; at: number }))[] = []
let candidates: Candidate[] = []
let loaded = false
let scanned = { path: '', offset: 0 }
let running: Promise<void> | undefined

/** For a session that predates the mod: its transcript's connector calls, each to be judged at the next turn's end. */
const backfill = async ($: Engine, now: number) => {
  const rows = await $.session.messages().catch(() => [])
  if (!Array.isArray(rows)) return []
  return rows
    .flatMap(r => r.toolUses.flatMap(u => (u.isError ? [] : findInCall(u.tool, u.input, u.text ?? ''))))
    .slice(-BACKFILL)
    .map(c => toPending(c, now, c))
}

/** A candidate as it waits to be stored: `judge` set while the judge has not kept it. */
const toPending = (c: Candidate, at: number, judge?: RefJudge) => {
  const j = judge ? { judge: { tool: judge.tool, op: judge.op, snippet: judge.snippet } } : {}
  return 'issue' in c.ref ? { issue: c.ref.issue, at, ...j } : { ...c.ref, at, ...j }
}

const syncOnce = async ($: Engine) => {
  const now = await $.clock.now()
  const cwd = await $.session.cwd()
  const sessionId = await $.session.id()
  const key = `references:${sessionId}`
  let refs = (await read($, references)).filter(r => !r.fromBranch)

  // first sync of this load: what the session kept, or for a session that predates the mod its transcript
  if (!loaded) {
    loaded = true
    const kept = ((await $.store.get(key)) as Reference[] | undefined)?.filter(k => !k.fromBranch)
    if (kept?.length) refs = [...kept.filter(k => !refs.some(r => r.url === k.url)), ...refs]
    else pending = [...(await backfill($, now)), ...pending]
  }

  // the PRs Claude Code recorded since the last read of the transcript
  const home = await $.env.get('HOME').catch(() => undefined)
  if (home) {
    const path = transcriptPath(home, cwd, sessionId)
    if (scanned.path !== path) scanned = { path, offset: 0 }
    const r = await $.process.run(prLinkScan(path, scanned.offset), { timeoutMs: 15_000 }).catch(() => undefined)
    if (r?.exitCode === 0) {
      const { size, links } = parsePrLinkScan(r.stdout)
      scanned.offset = size
      pending.push(...links.map(l => ({ ...prRef(l.url), at: l.at || now })))
    }
  }

  const found = pending
  pending = []
  const ready: Reference[] = []
  for (const f of found) {
    if (!('issue' in f)) ready.push(f)
    else {
      const v = await viewIssue($, f.issue)
      if (v?.url) ready.push({ ...issueRef(v.url), at: f.at, ...(f.judge ? { judge: f.judge } : {}) })
    }
  }
  refs = merge(refs, ready)

  // the current branch's PR and issue, shown while it is checked out
  const branch: Reference[] = []
  const pr = await viewPr($, undefined, cwd)
  if (pr && !refs.some(r => r.url === pr.url)) {
    branch.push({ ...prRef(pr.url), fromBranch: true, at: now })
  }
  const head = await $.process.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], { cwd, timeoutMs: 5000 }).catch(() => undefined)
  const issueKey = head?.exitCode === 0 ? head.stdout.trim().match(BRANCH_KEY)?.[1]?.toUpperCase() : undefined
  if (issueKey && !refs.some(r => r.label === issueKey)) {
    const v = await viewIssue($, issueKey)
    if (v?.url) branch.push({ ...issueRef(v.url), fromBranch: true, at: now })
  }

  // live status for every PR and issue; a failed look keeps the last one
  const fresh = await Promise.all([...refs, ...branch].map(async (r): Promise<Reference> => {
    if (r.kind === 'pr') {
      const v = pr?.url === r.url ? pr : await viewPr($, r.url, cwd)
      return v ? { ...r, title: v.title, status: prStatus(v) } : r
    }
    if (r.kind === 'issue') {
      const v = await viewIssue($, r.label)
      const status = v && issueStatus(v)
      return v ? { ...r, title: v.title ?? r.title, ...(status ? { status } : {}) } : r
    }
    return r
  }))

  await update($, references, () => fresh)
  await $.store.set(key, fresh)
}

/** The turn's verdicts: new candidates join (unsure ones marked), kept ones lose their mark, dropped ones go. */
const judgeTurn = async ($: Engine, reply: string, fresh: Candidate[]) => {
  const now = await $.clock.now()
  const unsure = (await read($, references)).filter(r => r.judge)
  const items = [
    ...fresh.map(c => ({ label: 'issue' in c.ref ? c.ref.issue : c.ref.label, url: 'issue' in c.ref ? '' : c.ref.url, judge: c })),
    ...unsure.map(r => ({ label: r.label, url: r.url, judge: r.judge! })),
  ]
  const verdicts = await ask($, reply, items)
  fresh.forEach((c, i) => {
    if (verdicts[i] !== 'drop') pending.push(toPending(c, now, verdicts[i] === 'unsure' ? c : undefined))
  })
  const settle = new Map(unsure.map((r, i) => [r.url, verdicts[fresh.length + i]!]))
  await update($, references, refs =>
    refs.flatMap(r => {
      const v = settle.get(r.url)
      if (v === 'drop') return []
      if (v === 'keep') {
        const { judge: _, ...kept } = r
        return [kept]
      }
      return [r]
    }),
  )
}

// one at a time, in order: a sync, or a turn's verdicts then a sync
const queue = ($: Engine, before?: () => Promise<void>): Promise<void> => {
  running = (running ?? Promise.resolve())
    .then(async () => {
      await before?.()
      await syncOnce($)
    })
    .catch(() => {})
  return running
}

// ---- how a reference looks wherever it is drawn: a glyph and a color for where it stands ----

const MUTED = '#94A3B8'
const STATE_COLOR: Record<RefStatus['state'], string> = {
  open: '#4ADE80',
  draft: MUTED,
  merged: '#A78BFA',
  closed: '#F87171',
  todo: MUTED,
  started: '#FBBF24',
  done: '#4ADE80',
  canceled: '#F87171',
}
const CHECK_MARK = { pass: ['✓', '#4ADE80'], fail: ['✗', '#F87171'], pending: ['●', '#FBBF24'] } as const
const UNSURE_MARK = ['?', MUTED] as const

/**
 * The glyph and its color (where the reference stands), and its mark: a PR's checks, or a `?` while the
 * judge has not said the session works on it, its glyph then dim too.
 */
export const refLook = (r: Reference): { glyph: string; color: string; mark?: readonly [string, string] } => ({
  glyph: r.kind === 'pr' ? '⇄' : r.kind === 'issue' ? '◆' : r.service === 'slack' ? '#' : '↗',
  color: r.judge ? MUTED : r.status ? STATE_COLOR[r.status.state] : r.kind === 'link' ? '#38BDF8' : MUTED,
  ...(r.judge ? { mark: UNSURE_MARK } : r.status?.checks ? { mark: CHECK_MARK[r.status.checks] } : {}),
})

export const registerReferences: Register = on => {
  on('session.start', { isInteractive: true }, async ($, e, next) => {
    $.clock.after(0, () => void queue($))
    $.clock.every(REFRESH_MS, () => void queue($))
    return next(e)
  })

  // record only: the judge and the lookups run on the clock, after the call and the turn have answered
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && !ran.isError) {
      candidates.push(...findInCall(e.tool, e as Record<string, unknown>, ran.text ?? '', ran.isReadOnly === true))
    }
    return ran
  }).catch(($, e, next) => next(e))

  // the main thread's turn has ended: judge its candidates and what was unsure before, off the turn's own time
  on('turn.complete', { isAborted: false }, async ($, e, next) => {
    if (e.agentId === undefined) {
      const fresh = candidates
      candidates = []
      const hasUnsure = (await read($, references)).some(r => r.judge)
      if (fresh.length > 0 || hasUnsure) $.clock.after(0, () => void queue($, () => judgeTurn($, e.answer, fresh)))
    }
    return next(e)
  })
}
