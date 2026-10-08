import { expect, test } from 'claude-code/testing'

const NOW = Date.parse('2026-10-08T08:00:00Z')

const band = (bodyColumns: number) => ({
  plugin: 'token-usage',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const)

const MEASURE = {
  context: { window: 200_000 },
  rateLimits: [
    { kind: 'five_hour', percentUsed: 42, resetsAt: new Date(NOW + 2 * 3600_000 + 5 * 60_000).toISOString() },
    { kind: 'seven_day', percentUsed: 91, resetsAt: new Date(NOW + 3 * 24 * 3600_000).toISOString() },
  ],
  cost: { usd: 1.234 },
  changed: ['rateLimits', 'cost'],
} as const

// the Raster's cells as [glyph, foreground, background]
const decode = (cells: string) => {
  const w = new Uint32Array(Uint8Array.fromBase64(cells).buffer)
  return Array.from({ length: w.length / 3 }, (_, i) => [String.fromCodePoint(w[i * 3]), w[i * 3 + 1], w[i * 3 + 2]] as const)
}

// the Raster's glyphs as a string, colors dropped
const glyphs = (cells: string) => decode(cells).map(([g]) => g).join('')

const SPENT = 0x64748b
const AHEAD = 0x334155

for (const surface of ['terminal', 'desktop'] as const) {
  test(`${surface} band shows a placeholder before the first response`, async ($, on) => {
    on('clock.now', () => ({ value: NOW }))
    const ui = await $.ui.mount({ ...band(120), surface })
    expect(await ui.find({ type: surface === 'terminal' ? 'Raster' : 'Svg' })).toBeDefined()
  })
}

test('terminal draws the usage as one Raster row', async ($, on) => {
  on('clock.now', () => ({ value: NOW }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await $.session.measure(MEASURE)
  const ui = await $.ui.mount({ ...band(200), surface: 'terminal' })
  const r = await ui.find({ type: 'Raster', key: 'token-usage' })
  const s = glyphs(r!.props.cells)
  // 42% of 12 cells is 40.3 eighths: five full blocks; 91% is 87.4: ten and 7/8
  expect(s).toContain('5h █████        42% ↻ 2h 05m')
  expect(s).toContain('7d ██████████▉  91% ↻ 3d 0h')
  // the track's shade is the time gone by: the 5h window 7/12 through after 2h55m, the 7d window 4/7
  const cells = decode(r!.props.cells)
  const track = (label: string) =>
    cells.slice(s.indexOf(label) + 3, s.indexOf(label) + 15).map(([, , bg]) => (bg === SPENT ? 's' : bg === AHEAD ? 'a' : '?')).join('')
  expect(track('5h')).toBe('sssssssaaaaa')
  expect(track('7d')).toBe('sssssssaaaaa')
  expect(cells[s.indexOf('7d') + 3][1]).toBe(0xef4444)
  expect(s).toContain('↑ 0')
  expect(s).toContain('≡ 0')
  expect(s).toContain('$1.23')
  expect(r!.props.columns).toBe(s.length)
})

test('terminal drops the cache pill first when the band is narrow', async ($, on) => {
  on('clock.now', () => ({ value: NOW }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await $.session.measure(MEASURE)
  const ui = await $.ui.mount({ ...band(90), surface: 'terminal' })
  const r = await ui.find({ type: 'Raster', key: 'token-usage' })
  const s = glyphs(r!.props.cells)
  expect(r!.props.columns).toBeLessThanOrEqual(90)
  expect(s).toContain('5h')
  expect(s).not.toContain('≡')
})

test('desktop draws the same pills as one Svg strip', async ($, on) => {
  on('clock.now', () => ({ value: NOW }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await $.session.measure(MEASURE)
  const ui = await $.ui.mount({ ...band(200), surface: 'desktop' })
  const svg = (await ui.find({ type: 'Svg' }))!.props.source as string
  for (const s of ['>5h<', '>42%<', '>2h 05m<', '>7d<', '>91%<', '>$1.23<']) expect(svg).toContain(s)
  expect(svg).not.toContain('@keyframes')
})

test('terminal shows a low use as a sliver, not an empty bar', async ($, on) => {
  on('clock.now', () => ({ value: NOW }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await $.session.measure({ ...MEASURE, rateLimits: [{ kind: 'seven_day', percentUsed: 3, resetsAt: MEASURE.rateLimits[1].resetsAt }] })
  const ui = await $.ui.mount({ ...band(200), surface: 'terminal' })
  // 3% of 96 eighths rounds to 3: a three-eighths block in the first cell
  expect(glyphs((await ui.find({ type: 'Raster', key: 'token-usage' }))!.props.cells)).toContain('7d ▍            3%')
})
