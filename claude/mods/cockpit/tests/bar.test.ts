import { expect, test } from 'claude-code/testing'

import { barCells, barRects, level, packCells, rgb, TRACK } from '../hooks/bar'
import { decode, glyphs } from './raster'

const SPENT = rgb('#64748B')

test('the terminal bar fills to 1/8 of a cell over the track', () => {
  // 3% of 10 cells is 2.4 eighths, 2 rounded: a quarter block, then empty track
  expect(barCells(3, 10, '#4ADE80').map(([g]) => g).join('')).toBe('▎         ')
  expect(barCells(100, 4, '#4ADE80').map(([g]) => g).join('')).toBe('████')
  expect(barCells(50, 4, '#4ADE80').every(([, fg, bg]) => fg === rgb('#4ADE80') && bg === rgb(TRACK))).toBe(true)
})

test('a mark shades the track behind the time gone by', () => {
  const bgs = barCells(0, 8, '#4ADE80', 0.5).map(([, , bg]) => (bg === SPENT ? 's' : 'a')).join('')
  expect(bgs).toBe('ssssaaaa')
})

test('the level turns amber at 75% and red at 90%, keeping the caller\'s color below', () => {
  expect([level(74), level(75), level(90)]).toEqual(['#4ADE80', '#FBBF24', '#EF4444'])
  expect(level(10, '#A78BFA')).toBe('#A78BFA')
})

test('packed cells read back as written', () => {
  const cells = barCells(42, 6, '#FBBF24', 0.25)
  expect(decode(packCells(cells))).toEqual(cells.map(([g, fg, bg]) => [g, fg, bg]))
  expect(glyphs(packCells(cells))).toBe(cells.map(([g]) => g).join(''))
})

test('the desktop bar draws its track, its fill and its mark', () => {
  const s = barRects(0, 4.5, 100, 42, '#4ADE80', 0.5)
  expect(s).toContain(`width="100" height="5" rx="2.5" fill="${TRACK}"`)
  expect(s).toContain('width="42" height="5" rx="2.5" fill="#4ADE80"')
  expect(s).toContain('x="49" y="1.5" width="2" height="11"')
  expect(barRects(0, 0, 100, 0, '#4ADE80')).not.toContain('#4ADE80')
})
