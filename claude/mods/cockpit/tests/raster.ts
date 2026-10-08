// Reading a Raster's packed `cells` back, for the tests of both instruments.

/** Each cell as [glyph, foreground, background]. */
export const decode = (cells: string) => {
  const w = new Uint32Array(Uint8Array.fromBase64(cells).buffer)
  return Array.from({ length: w.length / 3 }, (_, i) => [String.fromCodePoint(w[i * 3]), w[i * 3 + 1], w[i * 3 + 2]] as const)
}

/** The glyphs as a string, colors dropped. */
export const glyphs = (cells: string) => decode(cells).map(([g]) => g).join('')
