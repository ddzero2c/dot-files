/** Display width in cells: CJK and fullwidth count 2. */
export const cells = (s: string): number => {
  let w = 0
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0
    w += c >= 0x1100 && (c <= 0x115f || (c >= 0x2e80 && c <= 0xa4cf) || (c >= 0xac00 && c <= 0xd7a3) || (c >= 0xf900 && c <= 0xfaff) || (c >= 0xfe30 && c <= 0xfe4f) || (c >= 0xff00 && c <= 0xff60) || (c >= 0xffe0 && c <= 0xffe6) || (c >= 0x1f300 && c <= 0x1faff) || (c >= 0x20000 && c <= 0x3fffd)) ? 2 : 1
  }
  return w
}

/** Cuts `s` to at most `max` cells, with an ellipsis when cut. */
export const fit = (s: string, max: number): string => {
  if (max <= 0) return ''
  if (cells(s) <= max) return s
  let out = ''
  for (const ch of s) {
    if (cells(out + ch) > max - 1) break
    out += ch
  }
  return `${out}…`
}

/** Pads `s` with spaces to exactly `width` cells (cutting when longer). */
export const pad = (s: string, width: number): string => {
  const cut = fit(s, width)
  return cut + ' '.repeat(Math.max(0, width - cells(cut)))
}
