import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Snap, Win } from '../types'

const EMPTY: Snap = { five: null, seven: null, usd: null, tokIn: 0, tokOut: 0, tokCache: 0 }
const snap = atom({ plugin: 'token-usage', key: 'snap' } as const, EMPTY)

const tick = atom({ plugin: 'token-usage', key: 'tick' } as const, 0)

const H = 3600_000
const k = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : `${n}`)

const left = (iso: string | undefined, now: number) => {
  if (!iso) return ''
  const m = Math.max(0, Math.round((Date.parse(iso) - now) / 60000))
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)
  return d > 0 ? `${d}d ${h}h` : `${h}h ${String(m % 60).padStart(2, '0')}m`
}

// ---- model: what the band shows, surface-free; each surface below draws it its own way ----

// slate developer-tool palette: dark tinted pills read on both dark and light themes
const CARD = '#1B2336'
const FG = '#F8FAFC'
const MUTED = '#94A3B8'
const TRACK = '#334155'

const level = (p: number, fg: string) => (p >= 90 ? '#EF4444' : p >= 75 ? '#FBBF24' : fg)

type Icon = 'gauge' | 'cal' | 'clock' | 'up' | 'down' | 'layers' | 'coin'

type Part =
  // `glyph` stands in for the icon where only characters draw; without one the icon is left out there
  | { kind: 'icon'; icon: Icon; glyph?: string; color: string }
  | { kind: 'text'; text: string; color: string; bold?: boolean }
  // `mark`: how much of the window has gone by, 0..1
  | { kind: 'bar'; used: number; mark?: number; color: string }
  | { kind: 'sep' }
  // a skeleton's stand-in for text `n` characters long
  | { kind: 'ghost'; n: number }

type Pill = {
  tone: string
  parts: Part[]
  tip: string
  gap: 'near' | 'far' // space before the next pill: within a group or between groups
  keep: number // where room runs out the lowest goes first
}

const longLeft = (iso: string | undefined, now: number) => {
  if (!iso) return '重置時間未知'
  const m = Math.max(0, Math.round((Date.parse(iso) - now) / 60000))
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)
  if (d > 0) return `${d} 天 ${h} 小時後重置`
  if (h > 0) return `${h} 小時 ${m % 60} 分後重置`
  return `${m} 分後重置`
}

const winPill = (label: string, title: string, ic: Icon, w: Win, span: number, now: number, tone: string, fg: string, gap: Pill['gap'], keep: number): Pill => {
  const pct = `${Math.round(w.used)}%`
  const parts: Part[] = [
    { kind: 'icon', icon: ic, color: fg },
    { kind: 'text', text: label, color: MUTED },
    {
      kind: 'bar',
      used: w.used,
      mark: w.resetsAt ? Math.max(0, Math.min(1, 1 - (Date.parse(w.resetsAt) - now) / span)) : undefined,
      color: level(w.used, fg),
    },
    { kind: 'text', text: pct, color: FG, bold: true },
  ]
  if (w.resetsAt) parts.push({ kind: 'sep' }, { kind: 'icon', icon: 'clock', glyph: '↻', color: MUTED }, { kind: 'text', text: left(w.resetsAt, now), color: MUTED })
  const tip = `${title}：已用 ${pct}，${longLeft(w.resetsAt, now)}&#10;長條上的直線＝這個時段已經過了多少時間`
  return { tone, parts, tip, gap, keep }
}

const chipPill = (ic: Icon, glyph: string | undefined, label: string, tone: string, fg: string, tip: string, gap: Pill['gap'], keep: number): Pill => ({
  tone,
  parts: [{ kind: 'icon', icon: ic, glyph, color: fg }, { kind: 'text', text: label, color: FG }],
  tip,
  gap,
  keep,
})

const model = (v: Snap, now: number): Pill[] => {
  const pills: Pill[] = []
  if (v.five) pills.push(winPill('5h', '5 小時工作階段額度', 'gauge', v.five, 5 * H, now, '#22C55E', '#4ADE80', 'near', 6))
  if (v.seven) pills.push(winPill('7d', '7 天每週額度', 'cal', v.seven, 7 * 24 * H, now, '#8B5CF6', '#A78BFA', 'far', 5))
  pills.push(chipPill('up', '↑', k(v.tokIn), '#F43F5E', '#FB7185', `輸入 token：本工作階段送給模型的內容共 ${k(v.tokIn)}`, 'near', 3))
  pills.push(chipPill('down', '↓', k(v.tokOut), '#10B981', '#34D399', `輸出 token：模型在本工作階段產生的內容共 ${k(v.tokOut)}`, 'near', 2))
  pills.push(chipPill('layers', '≡', k(v.tokCache), '#6366F1', '#818CF8', `快取讀取 token：從提示快取重複使用 ${k(v.tokCache)}，計費較一般輸入低`, 'far', 0))
  if (v.usd !== null) pills.push(chipPill('coin', undefined, `$${v.usd.toFixed(2)}`, '#F59E0B', '#FBBF24', `工作階段費用：依 API 牌價估算約 $${v.usd.toFixed(2)} 美元`, 'near', 4))
  return pills
}

// placeholder pills in the same shapes until the first response brings numbers
const skeletonModel = (): Pill[] =>
  ([[29, 'near'], [29, 'far'], [6, 'near'], [6, 'near'], [6, 'far'], [5, 'near']] as const).map(([n, gap], i) => ({
    tone: CARD,
    parts: [{ kind: 'ghost', n }],
    tip: '',
    gap,
    keep: -i,
  }))

// ---- desktop: one SVG strip of rounded pills (Svg is the desktop's picture leaf) ----

const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"
const CW = 7.9 // monospace advance at 13px
const BAR_PX = 56

// 16x16 line icons, stroked in the caller's color
const icon = (name: Icon, x: number, c: string) => {
  const g: Record<Icon, string> = {
    gauge: '<path d="M2.5 12.5a6 6 0 1 1 11 0" /><path d="M8 11l2.6-3.6" />',
    cal: '<rect x="2.5" y="3.5" width="11" height="10" rx="2" /><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />',
    clock: '<circle cx="8" cy="8" r="5.5" /><path d="M8 5v3.2l2 1.2" />',
    up: '<path d="M8 10V3M5.2 5.6L8 2.8l2.8 2.8M3 10v3h10v-3" />',
    down: '<path d="M8 3v7M5.2 7.4L8 10.2l2.8-2.8M3 10v3h10v-3" />',
    layers: '<path d="M8 2.5l5.5 2.8L8 8.1 2.5 5.3zM2.5 8.2L8 11l5.5-2.8M2.5 11L8 13.8l5.5-2.8" />',
    coin: '<circle cx="8" cy="8" r="5.8" /><path d="M8 4.6v6.8M9.8 6.2c-.4-.6-1-.9-1.8-.9-1 0-1.8.5-1.8 1.3 0 1.8 3.6.8 3.6 2.6 0 .8-.8 1.3-1.8 1.3-.8 0-1.5-.3-1.9-.9" />',
  }
  return `<g transform="translate(${x} 6)" fill="none" stroke="${c}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${g[name]}</g>`
}

const svgText = (x: number, s: string, c: string, bold = false) =>
  `<text x="${x}" y="18.3" font-family="${MONO}" font-size="13" ${bold ? 'font-weight="700"' : ''} fill="${c}">${s}</text>`

// one part at x: [markup, width]
const svgPart = (p: Part, x: number): [string, number] => {
  switch (p.kind) {
    case 'icon':
      return [icon(p.icon, x, p.color), 16]
    case 'text':
      return [svgText(x, p.text, p.color, p.bold), p.text.length * (p.bold ? CW + 0.5 : CW)]
    case 'bar': {
      const filled = Math.max(0, Math.min(1, p.used / 100)) * BAR_PX
      let s = `<rect x="${x}" y="11.5" width="${BAR_PX}" height="5" rx="2.5" fill="${TRACK}"/>`
      if (filled > 0) s += `<rect x="${x}" y="11.5" width="${Math.max(5, filled)}" height="5" rx="2.5" fill="${p.color}"/>`
      if (p.mark !== undefined) s += `<rect x="${x + p.mark * (BAR_PX - 2)}" y="8.5" width="2" height="11" rx="1" fill="${FG}"/>`
      return [s, BAR_PX]
    }
    case 'sep':
      return [`<rect x="${x}" y="8" width="1" height="12" fill="${MUTED}" opacity=".35"/>`, 1]
    case 'ghost':
      return [`<circle cx="${x + 8}" cy="14" r="6" fill="${TRACK}"/><rect x="${x + 22}" y="10" width="${p.n * CW}" height="8" rx="4" fill="${TRACK}"/>`, 22 + p.n * CW]
  }
}

// <title> only shows as a tooltip when the Svg is isInteractive, which made the strip flicker, so it's left as alt text
const toSvg = (pills: Pill[], pulse: boolean) => {
  let x = 0
  let out = ''
  pills.forEach((p, i) => {
    const start = x
    let body = ''
    x += 11
    p.parts.forEach((part, j) => {
      const [s, w] = svgPart(part, x)
      body += s
      x += w + (j < p.parts.length - 1 ? 7 : 0)
    })
    x += 11
    const w = x - start
    out += `<g>${p.tip ? `<title>${p.tip}</title>` : ''}<rect x="${start}" y="0" width="${w}" height="28" rx="14" fill="${CARD}"/>` +
      `<rect x="${start + 0.5}" y=".5" width="${w - 1}" height="27" rx="13.5" fill="${p.tone}" fill-opacity=".14" stroke="${p.tone}" stroke-opacity=".38"/>${body}</g>`
    if (i < pills.length - 1) x += p.gap === 'far' ? 18 : 8
  })
  const w = Math.ceil(x)
  const anim = pulse ? '@keyframes p{50%{opacity:.45}}g{animation:p 1.4s ease-in-out infinite}' : ''
  return { w, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="28" viewBox="0 0 ${w} 28"><style>:root{color-scheme:light dark;background:transparent}${anim}</style>${out}</svg>` }
}

// ---- terminal: one Raster row of the same pills, in characters ----

const DEF = 0x01000000 // the terminal's own color
const BAR_CELLS = 10
const rgb = (hex: string) => parseInt(hex.slice(1), 16)
// a pill's fill: the desktop's tint at 14% over the card
const tint = (hex: string) => {
  const a = rgb(CARD)
  const b = rgb(hex)
  const ch = (s: number) => Math.round(((a >> s) & 255) * 0.86 + ((b >> s) & 255) * 0.14) << s
  return ch(16) | ch(8) | ch(0)
}

// one part as characters, each run in its color; [] where it has none
const charPart = (p: Part): [string, string][] => {
  switch (p.kind) {
    case 'icon':
      return p.glyph ? [[p.glyph, p.color]] : []
    case 'text':
      return [[p.text, p.color]]
    case 'bar': {
      const filled = Math.round(Math.max(0, Math.min(1, p.used / 100)) * BAR_CELLS)
      const mark = p.mark === undefined ? -1 : Math.min(BAR_CELLS - 1, Math.floor(p.mark * BAR_CELLS))
      return Array.from({ length: BAR_CELLS }, (_, i): [string, string] =>
        i === mark ? ['┃', FG] : i < filled ? ['━', p.color] : ['─', TRACK])
    }
    case 'sep':
      return []
    case 'ghost':
      return [['▬'.repeat(p.n), TRACK]]
  }
}

const charPill = (p: Pill) => p.parts.map(charPart).filter(r => r.length > 0)

type Run = number[] // [codePoint, fg, bg] per cell

const put = (r: Run, s: string, fg: number, bg: number) => {
  for (const c of s) r.push(c.codePointAt(0)!, fg, bg)
}

const len = (r: Run) => r.length / 3

// half blocks round the pill's ends against the terminal's background
const rasterPill = (p: Pill): Run => {
  const bg = tint(p.tone)
  const r: Run = []
  put(r, '▐', bg, DEF)
  for (const runs of charPill(p)) {
    put(r, ' ', DEF, bg)
    for (const [s, c] of runs) put(r, s, rgb(c), bg)
  }
  put(r, ' ', DEF, bg)
  put(r, '▌', bg, DEF)
  return r
}

// past `cols` the pill with the lowest `keep` goes first
const toRaster = (pills: Pill[], cols: number): Run => {
  const items = pills.map(p => ({ p, r: rasterPill(p) }))
  const gap = (p: Pill) => (p.gap === 'far' ? 2 : 1)
  const width = () => items.reduce((n, it, i) => n + len(it.r) + (i < items.length - 1 ? gap(it.p) : 0), 0)
  while (items.length > 1 && width() > cols) {
    items.splice(items.indexOf(items.reduce((a, b) => (b.p.keep < a.p.keep ? b : a))), 1)
  }
  const row: Run = []
  items.forEach((it, i) => {
    row.push(...it.r)
    if (i < items.length - 1) put(row, ' '.repeat(gap(it.p)), DEF, DEF)
  })
  return row
}

const pack = (r: Run) => new Uint8Array(Uint32Array.from(r).buffer).toBase64()

// ---- a surface with neither Raster nor Svg: the same characters as one Text ----

const toText = (pills: Pill[]) =>
  pills.map(p => charPill(p).map(runs => runs.map(([s]) => s).join('')).join(' ')).join('  │  ')

export const register: Register = on => {
  // redraw every 5 min so the reset countdowns and time markers keep moving; no model call
  on('session.start', async ($, e, next) => {
    $.clock.every(5 * 60_000, () => update($, tick, n => n + 1))
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    const f = e.rateLimits.find(r => r.kind === 'five_hour')
    const s = e.rateLimits.find(r => r.kind === 'seven_day')
    await update($, snap, v => ({
      ...v,
      five: f ? { used: f.percentUsed, resetsAt: f.resetsAt } : v.five,
      seven: s ? { used: s.percentUsed, resetsAt: s.resetsAt } : v.seven,
      usd: e.cost ? e.cost.usd : v.usd,
    }))
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const u = e.usage
    if (u) {
      await update($, snap, v => ({
        ...v,
        tokIn: v.tokIn + u.input_tokens + u.cache_creation_input_tokens,
        tokOut: v.tokOut + u.output_tokens,
        tokCache: v.tokCache + u.cache_read_input_tokens,
      }))
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    await read($, tick)
    const v = await read($, snap)
    const now = await $.clock.now()
    const empty = !v.five && !v.seven && v.usd === null && v.tokIn + v.tokOut === 0
    const pills = empty ? skeletonModel() : model(v, now)
    const alt = empty ? 'token-usage：等待第一次回應後顯示額度' : '5h / 7d 額度、token 與花費'

    // the terminal hands out an Svg too but draws it as an empty box, so branch on the surface
    if (e.surface === 'terminal') {
      const { Box, Raster } = $.ui.resolve(e)
      const row = toRaster(pills, e.props.bodyColumns)
      return <Box><Raster key="token-usage" columns={len(row)} rows={1} cells={pack(row)} /></Box>
    }

    const t = $.ui.resolve(e)
    const { Box, Text } = t
    if ('Svg' in t) {
      const { Svg } = t
      const { w, svg } = toSvg(pills, empty)
      return <Box><Svg source={svg} alt={alt} width={w} height={28} /></Box>
    }
    return <Box><Text dimColor={empty}>{empty ? `${alt}…` : toText(pills)}</Text></Box>
  })
}
