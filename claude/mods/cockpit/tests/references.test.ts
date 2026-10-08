import { expect, mock, test } from 'claude-code/testing'

import { findInCall, refLook } from '../hooks/references'
import type { Reference } from '../types'

type Body = Extract<Parameters<typeof test>[1], (...args: never[]) => unknown>
type On = Parameters<Body>[1]
type Dollar = Parameters<Body>[0]

const SID = 's-1'
const KEY = `references:${SID}`
const PR7 = 'https://github.com/o/r/pull/7'
const ISSUE = 'https://linear.app/koca/issue/KOC-2124'
const SLACK = 'https://koca.slack.com/archives/C1/p1700000000'

const prJson = (n: number, extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    url: `https://github.com/o/r/pull/${n}`,
    number: n,
    title: `PR ${n}`,
    state: 'OPEN',
    isDraft: false,
    statusCheckRollup: [{ status: 'COMPLETED', conclusion: 'SUCCESS' }],
    ...extra,
  })

const prLink = (n: number) =>
  JSON.stringify({ type: 'pr-link', prUrl: `https://github.com/o/r/pull/${n}`, prNumber: n, prRepository: 'o/r', timestamp: '2026-10-08T07:00:00Z' })

type World = { branchPr?: boolean; head?: string; messages?: unknown[]; prLinks?: number[] }

/**
 * The world beneath: a transcript holding `prLinks` (all before byte 500, its size), gh knowing every
 * PR, a branch named for KOC-2124 unless `head` says otherwise, Linear knowing every key. Returns the
 * clock and the scans the plugin ran, as [offset, path].
 */
const world = (on: On, opts: World = {}) => {
  const clock = mock.clock(on, { now: Date.parse('2026-10-08T08:00:00Z') })
  const scans: [string, string][] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: SID }))
  on('session.cwd', () => ({ value: '/repo' }))
  on('env.get', () => ({ value: '/home/me' }))
  on('session.messages', () => ({ value: opts.messages ?? [] }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('process.run', (_$, e) => {
    const a = e.argv.join(' ')
    const out = (stdout: string, exitCode = 0) => ({ value: { exitCode, stdout, stderr: '' } })
    if (e.argv[0] === 'sh') {
      const [offset = '', path = ''] = e.argv.slice(4)
      scans.push([offset, path])
      return out(['500', ...(offset === '1' ? (opts.prLinks ?? []).map(prLink) : [])].join('\n'))
    }
    if (a === 'git rev-parse --abbrev-ref HEAD') return out(`${opts.head ?? 'ryder/koc-2124-myship-return-info'}\n`)
    if (a.startsWith('gh pr view --json')) return opts.branchPr ? out(prJson(5)) : out('', 1)
    const n = a.match(/^gh pr view https:\/\/github\.com\/o\/r\/pull\/(\d+) /)?.[1]
    return n ? out(prJson(Number(n))) : out('', 1)
  })
  on('mcp.call', (_$, e) => ({
    value: {
      isError: false,
      content: [{ type: 'text', text: JSON.stringify({ id: 'u1', identifier: e.args.id, title: 'MyShip return info', url: `${ISSUE}/myship`, status: 'In Progress', statusType: 'started' }) }],
    },
  }))
  return { clock, scans }
}

// a store in memory the test can read back
const store = (on: On, entries: Record<string, unknown> = {}) => {
  const kept = new Map(Object.entries(entries))
  on('store.get', (_$, e) => ({ value: kept.get(e.key) }))
  on('store.set', (_$, e) => {
    kept.set(e.key, e.value)
    return { value: undefined }
  })
  return kept
}

const start = ($: Dollar) => $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })

// what the session kept, one word each: label, `*` for the branch's, `?` while unsure, state, checks
const brief = (kept: Map<string, unknown>) =>
  ((kept.get(KEY) as Reference[] | undefined) ?? []).map(
    r => `${r.label}${r.fromBranch ? '*' : ''}${r.judge ? '?' : ''} ${r.status?.state ?? '-'}${r.status?.checks ? ` ${r.status.checks}` : ''}`,
  )

const answered = (text: string) => ({
  value: { isAnswered: true, text, usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } },
})

// beneath: each connector call answers with `text`, and a turn ends with its answer
const connector = (on: On, text: (tool: string) => string) => {
  on('tool.call', (_$, e) => ({ result: { content: [] }, text: text(e.tool) }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
}

const turn = async ($: Dollar, calls: Record<string, unknown>[], answer = 'done') => {
  for (const c of calls) await $.tool.call(c as never)
  await $.turn.complete({ answer, durationMs: 1, isAborted: false, turnId: 't', reason: 'end_turn' })
}

const SEND = { tool: 'mcp__claude_ai_Slack__slack_send_message', channel_id: 'C1', message: 'deploy at 5' }
const slackText = () => `{"ok":true,"permalink":"${SLACK}"}`

test('a connector call counts when it reads one thing or writes; a search, a listing or a PR never', () => {
  const send = findInCall('mcp__claude_ai_Slack__slack_send_message', { channel_id: 'C1' }, `sent: ${SLACK}`)
  expect(send).toEqual([
    { ref: { url: SLACK, kind: 'link', service: 'slack', label: 'C1' }, tool: 'mcp__claude_ai_Slack__slack_send_message', op: 'write', snippet: `sent: ${SLACK}` },
  ])
  const thread = findInCall('mcp__claude_ai_Slack__slack_read_thread', { channel_id: 'C1' }, `thread ${SLACK}`, true)
  expect(thread.map(c => [c.op, c.ref])).toEqual([['read', { url: SLACK, kind: 'link', service: 'slack', label: 'C1' }]])
  expect(findInCall('mcp__claude_ai_Slack__slack_search_public', {}, SLACK, true)).toEqual([])
  expect(findInCall('mcp__claude_ai_Linear__list_issues', {}, ISSUE, true)).toEqual([])

  // a Linear call: its issue's own link first, else its key
  expect(findInCall('mcp__claude_ai_Linear__get_issue', { id: 'KOC-2124' }, `see ${PR7} and ${ISSUE}/x`, true).map(c => [c.op, c.ref])).toEqual([
    ['read', { url: ISSUE, kind: 'issue', service: 'linear', label: 'KOC-2124' }],
  ])
  expect(findInCall('mcp__claude_ai_Linear__save_comment', { issueId: 'KOC-2124' }, '{"id":"c1"}').map(c => c.ref)).toEqual([{ issue: 'KOC-2124' }])
  // a PR is Claude Code's own record's, never a connector's
  expect(findInCall('mcp__x__publish_post', {}, `posted ${PR7}`, false)).toEqual([])

  // live, the engine's read-only word decides a write, not the verb; in the backfill the verb does
  expect(findInCall('mcp__x__publish_post', {}, 'https://x.example/p/1', false).map(c => c.op)).toEqual(['write'])
  expect(findInCall('mcp__x__publish_post', {}, 'https://x.example/p/1', true)).toEqual([])
  expect(findInCall('mcp__x__publish_post', {}, 'https://x.example/p/1')).toEqual([])
  expect(findInCall('Bash', { command: 'gh pr create' }, PR7)).toEqual([])
})

test('the PRs Claude Code recorded are kept with their live status, beside the branch\'s issue', async ($, on) => {
  const { clock, scans } = world(on, { prLinks: [7] })
  const kept = store(on)
  await start($)
  await clock.settle()
  expect(brief(kept)).toEqual(['#7 open pass', 'KOC-2124* started'])
  expect(scans).toEqual([['1', '/home/me/.claude/projects/-repo/s-1.jsonl']])

  // the next read starts where this one stopped
  await clock.advance(60_000)
  expect(scans.at(-1)).toEqual(['501', '/home/me/.claude/projects/-repo/s-1.jsonl'])
  expect(brief(kept)).toEqual(['#7 open pass', 'KOC-2124* started'])
})

test('a resumed session keeps what it kept and finds its branch again', async ($, on) => {
  const { clock } = world(on, { head: 'master' })
  const kept = store(on, { [KEY]: [
    { url: PR7, kind: 'pr', service: 'github', label: '#7', at: 1 },
    { url: 'https://github.com/o/r/pull/3', kind: 'pr', service: 'github', label: '#3', fromBranch: true, at: 1 },
  ] })
  await start($)
  await clock.settle()
  expect(brief(kept)).toEqual(['#7 open pass'])
})

test('the current branch\'s PR is kept as the branch\'s while it is checked out', async ($, on) => {
  const { clock } = world(on, { head: 'master', branchPr: true })
  const kept = store(on)
  await start($)
  await clock.settle()
  expect(brief(kept)).toEqual(['#5* open pass'])
})

test('at a turn\'s end the judge keeps what the session works on and drops the rest', async ($, on) => {
  const { clock } = world(on, { head: 'master' })
  const kept = store(on)
  const asked: string[] = []
  on('model.complete', (_$, e) => {
    asked.push(e.model)
    return answered('{"keep":[0],"drop":[1],"unsure":[]}')
  })
  connector(on, tool => (tool.endsWith('send_message') ? slackText() : `{"url":"${ISSUE}/x"}`))
  await start($)
  await turn($, [SEND, { tool: 'mcp__claude_ai_Linear__get_issue', id: 'KOC-2124' }])
  await clock.settle()
  expect(asked).toEqual(['haiku'])
  expect(brief(kept)).toEqual(['C1 -'])
})

test('what the judge is unsure of stays with a ?, asked again every turn until it says', async ($, on) => {
  const { clock } = world(on, { head: 'master' })
  const kept = store(on)
  const answers = ['{"unsure":[0]}', '{"unsure":[0]}', '{"keep":[0]}']
  const prompts: string[] = []
  on('model.complete', (_$, e) => {
    prompts.push(typeof e.prompt === 'string' ? e.prompt : '')
    return answered(answers.shift() ?? '{}')
  })
  connector(on, slackText)
  await start($)
  await turn($, [SEND])
  await clock.settle()
  expect(brief(kept)).toEqual(['C1? -'])

  // a turn with nothing new still asks about it, as many turns as it takes
  await turn($, [])
  await clock.settle()
  expect(brief(kept)).toEqual(['C1? -'])
  await turn($, [])
  await clock.settle()
  expect(brief(kept)).toEqual(['C1 -'])
  expect(prompts).toHaveLength(3)
  for (const p of prompts) expect(p).toContain(SLACK)
})

test('when the judge fails, everything is kept, unsure', async ($, on) => {
  const { clock } = world(on, { head: 'master' })
  const kept = store(on)
  on('model.complete', () => ({ value: { isAnswered: false, reason: 'empty-reply', usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } }))
  connector(on, slackText)
  await start($)
  await turn($, [SEND])
  await clock.settle()
  expect(brief(kept)).toEqual(['C1? -'])
})

test('something kept stays kept when a later turn is unsure of it', async ($, on) => {
  const { clock } = world(on, { head: 'master' })
  const kept = store(on)
  const answers = ['{"keep":[0]}', '{"unsure":[0]}']
  on('model.complete', () => answered(answers.shift() ?? '{}'))
  connector(on, slackText)
  await start($)
  await turn($, [SEND])
  await clock.settle()
  await turn($, [SEND])
  await clock.settle()
  expect(brief(kept)).toEqual(['C1 -'])
})

test('a Linear call with no link is looked up by its key once kept', async ($, on) => {
  const { clock } = world(on, { head: 'master' })
  const kept = store(on)
  on('model.complete', () => answered('{"keep":[0]}'))
  connector(on, () => '{"id":"c1"}')
  await start($)
  await turn($, [{ tool: 'mcp__claude_ai_Linear__save_comment', issueId: 'KOC-2124', body: 'done' }])
  await clock.settle()
  expect(brief(kept)).toEqual(['KOC-2124 started'])
  expect(kept.get(KEY)).toEqual([expect.objectContaining({ url: ISSUE })])
})

test('a turn with nothing new and nothing unsure asks no model', async ($, on) => {
  const { clock } = world(on, { head: 'master' })
  store(on)
  let asked = 0
  on('model.complete', () => {
    asked++
    return answered('{}')
  })
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  await start($)
  await turn($, [])
  await clock.settle()
  expect(asked).toBe(0)
})

test('a session that predates the mod brings its transcript\'s calls, unsure until the next turn\'s judge', async ($, on) => {
  const messages = [{ role: 'assistant', text: '', toolUses: [{ tool_use_id: 't1', tool: SEND.tool, input: { channel_id: 'C1' }, text: slackText() }] }]
  const { clock } = world(on, { head: 'master', messages })
  const kept = store(on)
  on('model.complete', () => answered('{"keep":[0]}'))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  await start($)
  await clock.settle()
  expect(brief(kept)).toEqual(['C1? -'])
  await turn($, [])
  await clock.settle()
  expect(brief(kept)).toEqual(['C1 -'])
})

test('where a reference stands is its glyph\'s color; a PR\'s checks, or a ? while unsure, its mark', () => {
  const pr: Reference = { url: PR7, kind: 'pr', service: 'github', label: '#7', at: 1, status: { state: 'open', text: 'open', checks: 'fail' } }
  expect(refLook(pr)).toEqual({ glyph: '⇄', color: '#4ADE80', mark: ['✗', '#F87171'] })
  expect(refLook({ ...pr, status: { state: 'merged', text: 'merged' } })).toEqual({ glyph: '⇄', color: '#A78BFA' })
  const issue: Reference = { url: ISSUE, kind: 'issue', service: 'linear', label: 'KOC-2124', at: 1, status: { state: 'started', text: 'In Progress' } }
  expect(refLook(issue).color).toBe('#FBBF24')
  expect(refLook({ ...issue, judge: { tool: 't', op: 'read', snippet: '' } })).toEqual({ glyph: '◆', color: '#94A3B8', mark: ['?', '#94A3B8'] })
  expect(refLook({ url: SLACK, kind: 'link', service: 'slack', label: 'C1', at: 1 }).glyph).toBe('#')
})

test('a Linear key the judge is unsure of is looked up too, and keeps its ?', async ($, on) => {
  const { clock } = world(on, { head: 'master' })
  const kept = store(on)
  on('model.complete', () => answered('{"unsure":[0]}'))
  connector(on, () => '{"id":"c1"}')
  await start($)
  await turn($, [{ tool: 'mcp__claude_ai_Linear__save_comment', issueId: 'KOC-2124', body: 'done' }])
  await clock.settle()
  expect(brief(kept)).toEqual(['KOC-2124? started'])
})

test('nothing is evicted: every PR the session recorded stays, one per url', async ($, on) => {
  const { clock } = world(on, { head: 'master', prLinks: [...Array.from({ length: 20 }, (_, i) => i + 1), 3, 7] })
  const kept = store(on)
  await start($)
  await clock.settle()
  const labels = brief(kept).map(b => b.split(' ')[0])
  expect(labels).toHaveLength(20)
  expect(labels).toContain('#1')
  expect(new Set(labels).size).toBe(20)
})

test('a Slack thread is one reference, by its first message, however it was written to or read', () => {
  const root = 'https://koca.slack.com/archives/C1/p1700000000000100'
  const refOf = (tool: string, input: Record<string, unknown>, text: string, ro?: boolean) =>
    findInCall(`mcp__claude_ai_Slack__${tool}`, input, text, ro).map(c => ('url' in c.ref ? c.ref.url : ''))
  // the message that starts it
  expect(refOf('slack_send_message', { channel_id: 'C1' }, `{"permalink":"${root}"}`)).toEqual([root])
  // a reply: its link names the thread
  expect(refOf('slack_send_message', { channel_id: 'C1', thread_ts: '1700000000.000100' },
    '{"permalink":"https://koca.slack.com/archives/C1/p1700000999000200?thread_ts=1700000000.000100&cid=C1"}')).toEqual([root])
  // a reply whose link does not: the call's thread_ts does
  expect(refOf('slack_send_message', { channel_id: 'C1', thread_ts: '1700000000.000100' },
    '{"permalink":"https://koca.slack.com/archives/C1/p1700000999000200"}')).toEqual([root])
  // reading the thread, whatever links its messages hold
  expect(refOf('slack_read_thread', { channel_id: 'C1', message_ts: '1700000000.000100' },
    'see https://example.com and https://koca.slack.com/archives/C9/p1600000000000001', true)).toEqual([
    'https://koca.slack.com/archives/C1/p1700000000000100',
  ])
})
