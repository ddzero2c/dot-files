import { expect, test } from 'claude-code/testing'

import { parsePrLinkScan, transcriptPath } from '../hooks/transcript'

test('a transcript lives under its cwd with every character but a letter, a digit or - made -', () => {
  expect(transcriptPath('/h', '/Users/me/repo/koca/.claude/worktrees/koc-1647-api-停權', 's')).toBe(
    '/h/.claude/projects/-Users-me-repo-koca--claude-worktrees-koc-1647-api---/s.jsonl',
  )
})

test('a scan reads the size first, then each pr-link record', () => {
  const line = JSON.stringify({ type: 'pr-link', prUrl: 'https://github.com/o/r/pull/7', prNumber: 7, timestamp: '2026-10-08T07:00:00Z' })
  expect(parsePrLinkScan(`1234\n${line}\nnot json\n`)).toEqual({
    size: 1234,
    links: [{ url: 'https://github.com/o/r/pull/7', number: 7, at: Date.parse('2026-10-08T07:00:00Z') }],
  })
})
