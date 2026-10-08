import { expect, test } from 'claude-code/testing'

import { glyphs } from './raster'

const PANE = {
  plugin: 'cockpit',
  component: 'Pane',
  requestId: 'sessions-view',
  props: {
    title: 'Sessions',
    isFocused: true,
    bodyColumns: 60,
    placement: 'inline',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

const AGENTS_JSON = JSON.stringify([
  {
    id: 'ba1a6754',
    cwd: '/Users/me/repo/koca',
    kind: 'background',
    startedAt: Date.now() - 90_000,
    sessionId: 'ba1a6754-0000',
    name: 'check pasted screenshot',
    state: 'blocked',
  },
  {
    pid: 4843,
    cwd: '/Users/me/repo/koca/.claude/worktrees/feature-x',
    kind: 'interactive',
    startedAt: Date.now() - 5_000,
    sessionId: '10a5276a-0000',
    name: 'feature-x-38',
    status: 'busy',
  },
])

type Body = Extract<Parameters<typeof test>[1], (...args: never[]) => unknown>

// `prLinks`: what a transcript's pr-link scan answers (its size, then the records), for every transcript
const wire = (on: Parameters<Body>[1], calls: string[][], agentsJson = AGENTS_JSON, withCopy = true, prLinks = '0') => {
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.toast', () => ({ value: undefined }))
  on('session.id', () => ({ value: 'ba1a6754-0000' }))
  on('session.repo', () => ({ value: { root: '/Users/me/repo/koca', remote: null, internal: false, name: null, id: 'r' } }))
  on('env.get', () => ({ value: '/Users/me' }))
  on('session.model', () => ({ value: 'fable[1m]' }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { tokens: 150_000, window: 200_000, usd: 0, id: 'ctx' }, rateLimits: [], cost: undefined },
  }))
  if (withCopy) on('ui.copy', () => ({ value: { isCopied: true } }))
  on('fs.read', (_$, e) => ({
    value: e.path.endsWith('/sessions/4843.json')
      ? JSON.stringify({ pid: 4843, tmux: 'koca:@2.%3', entrypoint: 'cli' })
      : !e.path.includes('ba1a6754') ? '{}' : JSON.stringify({
      state: 'blocked',
      needs: 'pick a branch',
      children: [{ id: '6220', href: 'https://github.com/o/r/pull/6220', kind: 'pr' }],
    }),
  }))
  on('process.run', (_$, e) => {
    calls.push([...e.argv])
    const ok = (stdout: string) => ({
      value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
    })
    if (e.argv[0] === 'claude') return ok(agentsJson)
    if (e.argv[0] === 'sh') return ok(prLinks)
    if (e.argv[0] === 'git') return ok(e.argv[2]?.includes('feature-x') ? 'ryder/feature-x\n' : 'master\n')
    if (e.argv[0] === 'tail') {
      // The job's original transcript ended in a compaction: its tail points at the live file.
      if (e.argv[3]?.endsWith('/ba1a6754-0000.jsonl')) {
        return ok(
          [
            '{"type":"assistant","message":{"model":"claude-sonnet-5-5","usage":{"input_tokens":1,"cache_read_input_tokens":199000,"cache_creation_input_tokens":0}}}',
            '{"type":"continued-in","sessionId":"ba1a6754-0000","continuedInSessionId":"ba1a6754-cont"}',
            '{"type":"cost-state"}',
            '',
          ].join('\n'),
        )
      }
      return ok(
        [
          '{"type":"user","message":{}}',
          '{"type":"assistant","message":{"model":"claude-haiku-4-5-20251001","usage":{"input_tokens":100,"cache_read_input_tokens":59900,"cache_creation_input_tokens":0}}}',
          '',
        ].join('\n'),
      )
    }
    return ok('')
  })
}

const openPane = ($: Parameters<Body>[0]) =>
  $.command.run({ command: 'sessions-view', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 160 } })

test('lists this repo\'s sessions, blocked first, with PR links and the current one marked', async ($, on) => {
  const calls: string[][] = []
  wire(on, calls)
  await openPane($)
  expect(calls.some(c => c[0] === 'claude' && c.includes('--cwd') && c.includes('/Users/me/repo/koca'))).toBe(true)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /check pasted screenshot/ })).toBeDefined()
  // a session is not pressed; its block lights under the pointer
  expect(await ui.find({ type: 'Button', text: /check pasted screenshot/ })).toBeUndefined()
  expect(await ui.find({ type: 'Box', key: 'block:ba1a6754' })).toBeDefined()
  // what a blocked job waits on is not drawn: its group says it needs input
  expect(await ui.find({ type: 'Text', text: /pick a branch/ })).toBeUndefined()
  // what the job's state.json reports is drawn as a reference, its glyph grey for a status not looked up
  expect(await ui.find({ type: 'Button', key: 'ref:ba1a6754:https://github.com/o/r/pull/6220:open', text: 'r#6220' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^NEEDS INPUT$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^RUNNING$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /fable 1m/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /busy · ryder\/feature-x · .* · tmux koca:@2\.%3/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^   master · / })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /needs input · / })).toBeUndefined()
  // (a 200k model: haiku 4.5. The Claude 5 family counts against 1M, see windowFor.)
  // this session (the job) is from the engine (150k of 1M = 15 cells); the other row from its transcript (60k of 200k = 6)
  expect(await ui.find({ type: 'Text', text: /^   fable 1m $/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^   haiku 4\.5 $/ })).toBeDefined()
  // the terminal draws the shared Raster bar (hooks/bar.ts): full blocks, then empty track
  const bars = (await ui.findAll({ type: 'Raster' })).map(r => glyphs(r.props.cells as string))
  expect(bars.map(b => b.replace(/ +$/, ''))).toEqual(['█'.repeat(15), '█'.repeat(6)])
  expect(await ui.find({ type: 'Text', text: /\d+%/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /feature-x-38/ })).toBeDefined()
  // the group title names the state, so a row keeps only its glyph; the tally at the top counts them
  expect(await ui.find({ type: 'Text', text: /^! +$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^\+ +$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^! needs you +$/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^\+ 1 running$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^! 1 needs you$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /sessions/ })).toBeUndefined()
  await ui.unmount()

  // the desktop draws the shared SVG bar, one per row
  const desk = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await desk.findAll({ type: 'Svg' })).toHaveLength(2)
  expect(await desk.findAll({ type: 'Raster' })).toHaveLength(0)
  await desk.unmount()
})

test('an interactive session waiting on a prompt counts as needs input; stopped and crashed jobs get their own marks', async ($, on) => {
  const calls: string[][] = []
  wire(
    on,
    calls,
    JSON.stringify([
      { pid: 1, cwd: '/r', kind: 'interactive', startedAt: 1, sessionId: 'w', name: 'asking-you', status: 'waiting' },
      { pid: 2, cwd: '/r', kind: 'interactive', startedAt: 1, sessionId: 's', name: 'in-shell', status: 'shell' },
      { id: 'j1', cwd: '/r', kind: 'background', startedAt: 1, sessionId: 'j1', name: 'halted', state: 'stopped' },
      { id: 'j2', cwd: '/r', kind: 'background', startedAt: 1, sessionId: 'j2', name: 'fell-over', state: 'crashed' },
    ]),
  )
  await openPane($)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const names = (await ui.findAll({ type: 'Text' })).map(n => n.text)
  expect(names.indexOf('asking-you')).toBeGreaterThanOrEqual(0)
  expect(names.indexOf('asking-you')).toBeLessThan(names.indexOf('in-shell'))
  expect(await ui.find({ type: 'Text', text: /^! 1 needs you$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /running a command/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /■/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^halted/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /crashed · restarting/ })).toBeDefined()
  await ui.unmount()
})

test('shows a loading note before the first poll answers', async $ => {
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Loading/ })).toBeDefined()
  await ui.unmount()
})

test('the scope toggle drops --cwd to list every session, names each row\'s repo, and flips back', async ($, on) => {
  const calls: string[][] = []
  wire(
    on,
    calls,
    JSON.stringify([
      { id: 'me00', cwd: '/Users/me/repo/koca', kind: 'interactive', startedAt: 1, sessionId: 'ba1a6754-0000', name: 'me', status: 'busy', pid: 1 },
      { id: 'j9', cwd: '/Users/me/repo/other/.claude/worktrees/wt-z', kind: 'background', startedAt: 1, sessionId: 'j9-s', name: 'elsewhere', state: 'working' },
    ]),
  )
  await openPane($)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const agents = () => calls.filter(c => c[0] === 'claude' && c[1] === 'agents')

  expect(agents().every(c => c.includes('--cwd'))).toBe(true)
  expect(await ui.find({ type: 'Button', key: 'scope', text: /\[repo\]/ })).toBeDefined()

  calls.length = 0
  await ui.press({ key: 'scope' })
  expect(agents().length).toBeGreaterThan(0)
  expect(agents().some(c => c.includes('--cwd'))).toBe(false)
  expect(await ui.find({ type: 'Button', key: 'scope', text: /\[all\]/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /working · other · / })).toBeDefined()

  calls.length = 0
  await ui.press({ key: 'scope' })
  expect(agents().every(c => c.includes('--cwd'))).toBe(true)
  expect(await ui.find({ type: 'Button', key: 'scope', text: /\[repo\]/ })).toBeDefined()
  await ui.unmount()
})

test('a row shows its session\'s references: each id a Button that opens it, a PR by its repo, dim once finished', async ($, on) => {
  const calls: string[][] = []
  wire(on, calls)
  const PR = 'https://github.com/o/r/pull/6220'
  const ISSUE = 'https://linear.app/koca/issue/KOC-2124'
  // the job's cockpit kept the PR its state.json also reports, and the issue its branch names
  on('store.get', (_$, e) => ({
    value: e.key === 'references:ba1a6754-0000'
      ? [
          { url: PR, kind: 'pr', service: 'github', label: '#6220', at: 1, status: { state: 'merged', text: 'merged', checks: 'pass' } },
          { url: ISSUE, kind: 'issue', service: 'linear', label: 'KOC-2124', fromBranch: true, at: 1, status: { state: 'started', text: 'In Progress' } },
        ]
      : undefined,
  }))
  await openPane($)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })

  expect(await ui.find({ type: 'Button', key: `ref:ba1a6754:${PR}:open`, text: 'r#6220' })).toBeDefined()
  expect(await ui.find({ type: 'Button', key: `ref:ba1a6754:${ISSUE}:open`, text: 'KOC-2124' })).toBeDefined()
  // the merged PR is dim, the issue in progress is not; nothing stands before an id
  expect((await ui.find({ type: 'Button', key: `ref:ba1a6754:${PR}:open` }))!.props.dimColor).toBe(true)
  expect((await ui.find({ type: 'Button', key: `ref:ba1a6754:${ISSUE}:open` }))!.props.dimColor).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^[⇄◆]$/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: '✓' })).toBeDefined()
  // the job's own report of the same PR is not drawn twice
  expect(await ui.findAll({ type: 'Button', text: 'r#6220' })).toHaveLength(1)

  await ui.press({ key: `ref:ba1a6754:${PR}:open` })
  expect(calls.some(c => c[0] === 'open' && c[1] === PR)).toBe(true)
  await ui.unmount()
})


test('a session with no cockpit of its own shows the PRs Claude Code recorded in its transcript', async ($, on) => {
  const calls: string[][] = []
  const PR = 'https://github.com/o/r/pull/77'
  wire(on, calls, AGENTS_JSON, true, ['900', JSON.stringify({ type: 'pr-link', prUrl: PR, prNumber: 77, prRepository: 'o/r', timestamp: '2026-10-08T07:00:00Z' })].join('\n'))
  await openPane($)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  // the interactive session (no store of references): its transcript, read from the start
  expect(await ui.find({ type: 'Button', key: `ref:10a5276a-0000:${PR}:open`, text: 'r#77' })).toBeDefined()
  const scan = calls.find(c => c[0] === 'sh')!
  expect(scan.slice(4)).toEqual(['1', '/Users/me/.claude/projects/-Users-me-repo-koca--claude-worktrees-feature-x/10a5276a-0000.jsonl'])
  // the background job is not read: its children are the same records, already there
  expect(calls.filter(c => c[0] === 'sh')).toHaveLength(1)
  await ui.unmount()
})

test('the app draws each session as a card and each reference as a chip, with no title of its own', async ($, on) => {
  const calls: string[][] = []
  wire(on, calls)
  const PR = 'https://github.com/o/r/pull/6220'
  on('store.get', (_$, e) => ({
    value: e.key === 'references:ba1a6754-0000'
      ? [{ url: PR, kind: 'pr', service: 'github', label: 'r#6220', at: 1, status: { state: 'merged', text: 'merged' } }]
      : undefined,
  }))
  await openPane($)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  // the pane's frame names it; the tally and the scope toggle sit at the top
  expect(await ui.find({ type: 'Text', text: /^Sessions/ })).toBeUndefined()
  expect(await ui.find({ type: 'Button', key: 'scope', text: '[repo]' })).toBeDefined()
  // this session's card is edged blue, another's slate
  const self = await ui.find({ type: 'Box', key: 'block:ba1a6754' })
  expect(self!.props).toMatchObject({ borderStyle: 'round', borderColor: '#60A5FA' })
  expect((await ui.find({ type: 'Box', key: 'block:10a5276a-0000' }))!.props).toMatchObject({ borderStyle: 'round', borderColor: '#2F3746' })
  // a merged PR's chip is tinted purple
  expect((await ui.find({ type: 'Box', key: `ref:ba1a6754:${PR}` }))!.props).toMatchObject({ backgroundColor: '#2D2547', paddingX: 1 })
  await ui.unmount()

  // the terminal keeps its title and plain blocks
  const term = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await term.find({ type: 'Text', text: /^Sessions/ })).toBeDefined()
  expect((await term.find({ type: 'Box', key: 'block:10a5276a-0000' }))!.props.borderStyle).toBeUndefined()
  await term.unmount()
})

