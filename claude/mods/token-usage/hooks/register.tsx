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

// ---- desktop: one SVG strip of rounded pills (Svg is the desktop's picture leaf) ----

const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"
const CW = 7.9 // monospace advance at 13px

type Icon = 'gauge' | 'cal' | 'clock' | 'up' | 'down' | 'layers' | 'coin'

// 16x16 line icons, drawn with currentColor-ish stroke set by the caller
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

// slate developer-tool palette: dark tinted pills read on both dark and light app themes
const CARD = '#1B2336'
const FG = '#F8FAFC'
const MUTED = '#94A3B8'
const TRACK = '#334155'

const level = (p: number, fg: string) => (p >= 90 ? '#EF4444' : p >= 75 ? '#FBBF24' : fg)

// <title> is the native hover tooltip (works because the Svg is drawn isInteractive)
const pill = (x: number, w: number, bg: string, body: string, tip: string) =>
  `<g class="p"><title>${tip}</title><rect x="${x}" y="0" width="${w}" height="28" rx="14" fill="${CARD}"/>` +
  `<rect class="h" x="${x + 0.5}" y=".5" width="${w - 1}" height="27" rx="13.5" fill="${bg}" fill-opacity=".14" stroke="${bg}" stroke-opacity=".38"/>${body}</g>`

const longLeft = (iso: string | undefined, now: number) => {
  if (!iso) return '重置時間未知'
  const m = Math.max(0, Math.round((Date.parse(iso) - now) / 60000))
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)
  if (d > 0) return `${d} 天 ${h} 小時後重置`
  if (h > 0) return `${h} 小時 ${m % 60} 分後重置`
  return `${m} 分後重置`
}

const text = (x: number, s: string, c: string, bold = false) =>
  `<text x="${x}" y="18.3" font-family="${MONO}" font-size="13" ${bold ? 'font-weight="700"' : ''} fill="${c}">${s}</text>`

// returns [svg, width]
const winPill = (x: number, label: string, title: string, ic: Icon, w: Win, span: number, now: number, bg: string, fg: string): [string, number] => {
  const c = level(w.used, fg)
  const pct = `${Math.round(w.used)}%`
  const reset = left(w.resetsAt, now)
  const BAR = 56
  let cx = x + 11
  let s = icon(ic, cx, fg)
  cx += 16 + 6
  s += text(cx, label, MUTED)
  cx += label.length * CW + 7
  const filled = Math.max(0, Math.min(1, w.used / 100)) * BAR
  s += `<rect x="${cx}" y="11.5" width="${BAR}" height="5" rx="2.5" fill="${TRACK}"/>`
  if (filled > 0) s += `<rect x="${cx}" y="11.5" width="${Math.max(5, filled)}" height="5" rx="2.5" fill="${c}"/>`
  if (w.resetsAt) {
    const el = Math.max(0, Math.min(1, 1 - (Date.parse(w.resetsAt) - now) / span))
    s += `<rect x="${cx + el * (BAR - 2)}" y="8.5" width="2" height="11" rx="1" fill="${FG}"/>`
  }
  cx += BAR + 9
  s += text(cx, pct, FG, true)
  cx += pct.length * (CW + 0.5) + 8
  s += `<rect x="${cx}" y="8" width="1" height="12" fill="${MUTED}" opacity=".35"/>`
  cx += 9
  s += icon('clock', cx, fg)
  cx += 16 + 5
  s += text(cx, reset, MUTED)
  cx += reset.length * CW + 11
  const tip = `${title}：已用 ${pct}，${longLeft(w.resetsAt, now)}&#10;長條上的直線＝這個時段已經過了多少時間`
  return [pill(x, cx - x, bg, s, tip), cx - x]
}

const chip = (x: number, ic: Icon, label: string, bg: string, fg: string, tip: string): [string, number] => {
  const w = 11 + 16 + 5 + label.length * CW + 11
  const body = icon(ic, x + 11, fg) + text(x + 11 + 16 + 5, label, FG)
  return [pill(x, w, bg, body, tip), w]
}

const strip = (v: Snap, now: number) => {
  const parts: string[] = []
  let x = 0
  const add = ([s, w]: [string, number], gap = 8) => {
    parts.push(s)
    x += w + gap
  }
  if (v.five) add(winPill(x, '5h', '5 小時工作階段額度', 'gauge', v.five, 5 * H, now, '#22C55E', '#4ADE80'))
  if (v.seven) add(winPill(x, '7d', '7 天每週額度', 'cal', v.seven, 7 * 24 * H, now, '#8B5CF6', '#A78BFA'), 18)
  add(chip(x, 'up', k(v.tokIn), '#F43F5E', '#FB7185', `輸入 token：本工作階段送給模型的內容共 ${k(v.tokIn)}`))
  add(chip(x, 'down', k(v.tokOut), '#10B981', '#34D399', `輸出 token：模型在本工作階段產生的內容共 ${k(v.tokOut)}`))
  add(chip(x, 'layers', k(v.tokCache), '#6366F1', '#818CF8', `快取讀取 token：從提示快取重複使用 ${k(v.tokCache)}，計費較一般輸入低`), 18)
  if (v.usd !== null) add(chip(x, 'coin', `$${v.usd.toFixed(2)}`, '#F59E0B', '#FBBF24', `工作階段費用：依 API 牌價估算約 $${v.usd.toFixed(2)} 美元`))
  const w = Math.ceil(x - 8)
  return { w, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="28" viewBox="0 0 ${w} 28"><style>:root{color-scheme:light dark;background:transparent}.p{cursor:help}.p .h{transition:fill-opacity .12s}.p:hover .h{fill-opacity:.26}</style>${parts.join('')}</svg>` }
}

// ---- terminal fallback: text chips ----

const bar = (w: Win, span: number, now: number) => {
  const n = 8
  const cells = Array.from({ length: n }, (_, i) => (i < Math.round((w.used / 100) * n) ? '━' : '─'))
  if (w.resetsAt) {
    const el = 1 - (Date.parse(w.resetsAt) - now) / span
    cells[Math.min(n - 1, Math.max(0, Math.floor(el * n)))] = '┃'
  }
  return cells.join('')
}

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
    const t = $.ui.resolve(e)
    const { Box, Text } = t

    if (!v.five && !v.seven && v.usd === null && v.tokIn + v.tokOut === 0) {
      return <Box><Text dimColor>token-usage：等待第一次回應後顯示額度…</Text></Box>
    }

    if ('Svg' in t) {
      const { Svg } = t
      const { w, svg } = strip(v, now)
      return <Box><Svg source={svg} alt="5h / 7d 額度、token 與花費" width={w} height={28} isInteractive /></Box>
    }

    const line = [
      v.five && `5h ${bar(v.five, 5 * H, now)} ${Math.round(v.five.used)}% ↻ ${left(v.five.resetsAt, now)}`,
      v.seven && `7d ${bar(v.seven, 7 * 24 * H, now)} ${Math.round(v.seven.used)}% ↻ ${left(v.seven.resetsAt, now)}`,
      `⇧ ${k(v.tokIn)}  ⇩ ${k(v.tokOut)}  ▤ ${k(v.tokCache)}`,
      v.usd !== null && `$${v.usd.toFixed(2)}`,
    ].filter(Boolean).join('  │  ')
    return <Box><Text>{line}</Text></Box>
  })
}
