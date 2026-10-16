// The usage band's bar: the thresholds and colors, a rounded
// SVG track on the desktop, and on the terminal a Raster track filled to 1/8 of a cell.

export const TRACK = '#334155'
const MARK = '#F8FAFC'
const SPENT = '#64748B'

/** Green, then amber from 75%, red from 90%; `ok` is the color below 75%. */
export const level = (pct: number, ok = '#4ADE80') => (pct >= 90 ? '#EF4444' : pct >= 75 ? '#FBBF24' : ok)

export const rgb = (hex: string) => parseInt(hex.slice(1), 16)

const frac = (pct: number) => Math.max(0, Math.min(1, pct / 100))

/**
 * Desktop: the track and its fill as SVG rects at (x, y), `w` wide and 5px high. `mark` (0..1, how much
 * of the window has gone by) adds a tick across the track.
 */
export const barRects = (x: number, y: number, w: number, pct: number, color: string, mark?: number) => {
  const filled = frac(pct) * w
  let s = `<rect x="${x}" y="${y}" width="${w}" height="5" rx="2.5" fill="${TRACK}"/>`
  if (filled > 0) s += `<rect x="${x}" y="${y}" width="${Math.max(5, filled)}" height="5" rx="2.5" fill="${color}"/>`
  if (mark !== undefined) s += `<rect x="${x + mark * (w - 2)}" y="${y - 3}" width="2" height="11" rx="1" fill="${MARK}"/>`
  return s
}

/** One terminal cell: a glyph, its foreground and its background, each color `0xRRGGBB`. */
export type Cell = [glyph: string, fg: number, bg: number]

const EIGHTHS = ' ▏▎▍▌▋▊▉█'

/**
 * Terminal: what only a Raster gives. A partial block's foreground over its background fills to 1/8 of
 * a cell, and each cell's background is free to say something of its own: with `mark`, the track behind
 * the time already gone is a shade lighter, so usage is the fill, time the shade, and no glyph marks either.
 */
export const barCells = (pct: number, cells: number, color: string, mark?: number): Cell[] => {
  const fill = Math.round(frac(pct) * cells * 8)
  const spent = mark === undefined ? 0 : Math.round(mark * cells)
  const fg = rgb(color)
  return Array.from({ length: cells }, (_, i): Cell =>
    [EIGHTHS[Math.max(0, Math.min(8, fill - i * 8))], fg, rgb(i < spent ? SPENT : TRACK)])
}

/** A Raster's `cells`: each cell as little-endian u32 `[codePoint, fg, bg]`, base64. */
export const pack = (words: number[]) => new Uint8Array(Uint32Array.from(words).buffer).toBase64()

export const packCells = (cells: Cell[]) => pack(cells.flatMap(([g, fg, bg]) => [g.codePointAt(0)!, fg, bg]))
