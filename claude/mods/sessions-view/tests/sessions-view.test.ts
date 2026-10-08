import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'sessions-view',
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

// a Raster's glyphs as a string, colors dropped
const glyphs = (cells: string) => {
  const w = new Uint32Array(Uint8Array.fromBase64(cells).buffer)
  let s = ''
  for (let i = 0; i < w.length; i += 3) s += String.fromCodePoint(w[i])
  return s
}

type Body = Extract<Parameters<typeof test>[1], (...args: never[]) => unknown>

const wire = (on: Parameters<Body>[1], calls: string[][], agentsJson = AGENTS_JSON, withCopy = true) => {
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
  expect(await ui.find({ type: 'Text', text: /2 sessions/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /1 need input/ })).toBeDefined()
  expect(await ui.find({ type: 'Button', text: /check pasted screenshot/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /pick a branch/ })).toBeDefined()
  expect(await ui.find({ type: 'Markdown', key: 'links:ba1a6754', text: /\[#6220\]\(https:\/\/github\.com\/o\/r\/pull\/6220\)/ })).toBeDefined()
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
  // the terminal draws token-usage's Raster track: full blocks, then empty track
  const bars = (await ui.findAll({ type: 'Raster' })).map(r => glyphs(r.props.cells as string))
  expect(bars.map(b => b.replace(/ +$/, ''))).toEqual(['█'.repeat(15), '█'.repeat(6)])
  expect(await ui.find({ type: 'Text', text: /\d+%/ })).toBeUndefined()
  expect(await ui.find({ type: 'Button', text: /feature-x-38/ })).toBeDefined()
  // the group title names the state, so a row keeps only its glyph; the footer still tallies
  expect(await ui.find({ type: 'Text', text: /^! +$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^\+ +$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^! needs you +$/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^\+ 1 running$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^! 1 needs you$/ })).toBeDefined()
  await ui.unmount()

  // the desktop draws the same bars as token-usage, an SVG track per row
  const desk = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await desk.findAll({ type: 'Svg' })).toHaveLength(2)
  expect(await desk.findAll({ type: 'Raster' })).toHaveLength(0)
  await desk.unmount()
})

test('pressing a row copies the command that opens it; pressing a PR link opens the PR', async ($, on) => {
  const calls: string[][] = []
  const copied: string[] = []
  wire(on, calls, AGENTS_JSON, false)
  on('ui.copy', (_$, e) => {
    copied.push(e.text)
    return { value: { isCopied: true } }
  })
  await openPane($)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })

  await ui.press({ key: 'row:10a5276a-0000' })
  expect(copied).toEqual(['claude --resume 10a5276a-0000'])
  expect(calls.some(c => c[0] === 'tmux')).toBe(false)

  await ui.press({ key: 'links:ba1a6754', link: { href: 'https://github.com/o/r/pull/6220' } })
  expect(calls.some(c => c[0] === 'open' && c[1] === 'https://github.com/o/r/pull/6220')).toBe(true)

  // pressing this session's own row only says so
  copied.length = 0
  await ui.press({ key: 'row:ba1a6754' })
  expect(copied).toEqual([])
  await ui.unmount()
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
  const buttons = (await ui.findAll({ type: 'Button' })).map(n => n.text)
  expect(buttons.indexOf('asking-you')).toBeGreaterThanOrEqual(0)
  expect(buttons.indexOf('asking-you')).toBeLessThan(buttons.indexOf('in-shell'))
  expect(await ui.find({ type: 'Text', text: /1 need input/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /running a command/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /■/ })).toBeDefined()
  expect(await ui.find({ type: 'Button', text: /^halted$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /crashed · restarting/ })).toBeDefined()
  await ui.unmount()
})

test('pressing a finished background job resumes it here through /resume', async ($, on) => {
  const calls: string[][] = []
  const resumed: string[] = []
  wire(
    on,
    calls,
    JSON.stringify([
      { id: 'me00', cwd: '/r', kind: 'interactive', startedAt: 1, sessionId: 'ba1a6754-0000', name: 'me', status: 'busy', pid: 1 },
      { id: 'j1', cwd: '/r', kind: 'background', startedAt: 1, sessionId: 'j1-session', name: 'finished-job', state: 'done' },
      { id: 'j2', cwd: '/r', kind: 'background', startedAt: 1, sessionId: 'j2-session', name: 'live-job', state: 'blocked', status: 'idle', pid: 9 },
    ]),
  )
  on('command.run', { command: 'resume' }, (_$, e) => {
    resumed.push(e.args)
    return { text: 'resumed' }
  })
  await openPane($)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })

  await ui.press({ key: 'row:j1' })
  expect(resumed).toEqual(['j1-session'])

  // a job whose worker is alive is not resumable from here: its attach command is copied instead
  await ui.press({ key: 'row:j2' })
  expect(resumed).toEqual(['j1-session'])
  await ui.unmount()
})

test('shows a loading note before the first poll answers', async $ => {
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Loading/ })).toBeDefined()
  await ui.unmount()
})

test('every other row has an ✗ that asks first; Yes removes a job via claude rm, closes an interactive session and its worktree', async ($, on) => {
  const calls: string[][] = []
  wire(
    on,
    calls,
    JSON.stringify([
      { id: 'me00', cwd: '/r', kind: 'interactive', startedAt: 1, sessionId: 'ba1a6754-0000', name: 'me', status: 'busy', pid: 1 },
      { id: 'j1', cwd: '/r/.claude/worktrees/wt-a', kind: 'background', startedAt: 1, sessionId: 'j1-session', name: 'finished-job', state: 'done' },
      { pid: 77, cwd: '/r/.claude/worktrees/wt-b', kind: 'interactive', startedAt: 1, sessionId: 'i2', name: 'other-tty', status: 'idle' },
    ]),
  )
  await openPane($)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })

  expect(await ui.find({ type: 'Button', key: 'rm:me00' })).toBeUndefined()
  expect(await ui.find({ type: 'Button', key: 'rm:j1' })).toBeDefined()
  expect(await ui.find({ type: 'Button', key: 'rm:i2' })).toBeDefined()

  // ✗ alone runs nothing
  await ui.press({ key: 'rm:j1' })
  expect(await ui.find({ type: 'Text', text: /remove \+ worktree\?/ })).toBeDefined()
  expect(calls.some(c => c[0] === 'claude' && c[1] === 'rm')).toBe(false)
  await ui.press({ key: 'no:j1' })
  expect(await ui.find({ type: 'Button', key: 'rm:j1' })).toBeDefined()

  await ui.press({ key: 'rm:j1' })
  await ui.press({ key: 'yes:j1' })
  expect(calls.some(c => c[0] === 'claude' && c[1] === 'rm' && c[2] === 'j1')).toBe(true)

  await ui.press({ key: 'rm:i2' })
  expect(await ui.find({ type: 'Text', text: /close \+ worktree\?/ })).toBeDefined()
  await ui.press({ key: 'yes:i2' })
  expect(calls.some(c => c[0] === 'kill' && c[2] === '77')).toBe(true)
  expect(calls.some(c => c[0] === 'git' && c.includes('worktree') && c.includes('remove') && c.includes('/r/.claude/worktrees/wt-b'))).toBe(true)
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
