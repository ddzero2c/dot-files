// Reading a session's transcript (`~/.claude/projects/<slug>/<session id>.jsonl`), pure: where it is,
// and the PRs Claude Code itself recorded in it. No I/O here; each hooks file runs its own.

/** The project folder's name for a cwd: every character but a letter, a digit or `-` becomes `-`. */
export const projectSlug = (cwd: string): string => cwd.replace(/[^A-Za-z0-9-]/g, '-')

export const transcriptPath = (home: string, cwd: string, sessionId: string) =>
  `${home}/.claude/projects/${projectSlug(cwd)}/${sessionId}.jsonl`

/**
 * Finds the `pr-link` records Claude Code writes when a `gh` command's output or a push names a PR (the
 * ones the agent view's PR labels and a background job's `children` come from), from byte `$1` on of
 * the file `$2`: `['sh', '-c', PR_LINK_SCAN, 'sh', String(offset + 1), path]`. The file's size comes
 * first, alone on its line, so the next scan starts there.
 */
export const PR_LINK_SCAN = 'wc -c < "$2" && { tail -c +"$1" "$2" | grep -F \'"type":"pr-link"\' || true; }'

export const prLinkScan = (path: string, offset: number) => ['sh', '-c', PR_LINK_SCAN, 'sh', String(offset + 1), path]

export type PrLink = { url: string; number: number; at: number }

/** A scan's output: the file's size, then a `pr-link` record per line. */
export const parsePrLinkScan = (stdout: string): { size: number; links: PrLink[] } => {
  const [head = '', ...lines] = stdout.split('\n')
  const links = lines.flatMap((line): PrLink[] => {
    try {
      const o = JSON.parse(line) as { type?: string; prUrl?: unknown; prNumber?: unknown; timestamp?: unknown }
      if (o.type !== 'pr-link' || typeof o.prUrl !== 'string') return []
      const at = typeof o.timestamp === 'string' ? Date.parse(o.timestamp) : NaN
      const number = typeof o.prNumber === 'number' ? o.prNumber : Number(o.prUrl.split('/').at(-1))
      return [{ url: o.prUrl, number, at: Number.isNaN(at) ? 0 : at }]
    } catch {
      return []
    }
  })
  return { size: Number(head.trim()) || 0, links }
}
