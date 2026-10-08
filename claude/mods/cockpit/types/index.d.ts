export type FleetKind = 'interactive' | 'background'

/** One row of `claude agents --json`, plus what the job's state.json adds. */
export type FleetRow = {
  key: string
  sessionId: string
  name: string
  cwd: string
  /** The branch checked out at `cwd` (a worktree's own), or a short sha when detached. */
  branch?: string
  kind: FleetKind
  /** The live process, when one runs (interactive sessions, bg workers). */
  pid?: number
  startedAt: number
  /** Background job state: working | blocked | done | failed | ... */
  state?: string
  /** Live process status: busy | idle */
  status?: string
  /** What a blocked job is waiting on (its state.json `needs`). */
  needs?: string
  /** Linked artifacts the job reported (its state.json `children`): PRs, issues. */
  links: FleetLink[]
  /** Context window use: tokens in the last request and the window they count against. */
  context?: { tokens: number; window: number; model?: string }
  /** What the session kept as its references (its cockpit's store), the current branch's among them. */
  refs?: Reference[]
  /** Where an interactive session runs: `tmux <session>:<window>.<pane>`, or another terminal. */
  where?: string
  isSelf: boolean
}

export type FleetLink = {
  id: string
  href: string
  kind: string
}

export type FleetView = {
  rows: FleetRow[]
  refreshedAt: number
  error?: string
}

/** One rate-limit window: percent used and when it resets. */
export type Win = { used: number; resetsAt?: string }

/** What the usage band shows: the 5h / 7d windows, the session's cost and its token totals. */
export type Snap = {
  five: Win | null
  seven: Win | null
  usd: number | null
  tokIn: number
  tokOut: number
  tokCache: number
}

/** What a reference is: a GitHub PR, a Linear issue, or any other link a connector's write returned. */
export type RefKind = 'pr' | 'issue' | 'link'

/** Where a PR or issue stands, as the band colors it. */
export type RefState = 'open' | 'draft' | 'merged' | 'closed' | 'todo' | 'started' | 'done' | 'canceled'

export type RefStatus = {
  state: RefState
  /** The status as its service names it: `open`, `In Progress`. */
  text: string
  /** A PR's checks, when it has any. */
  checks?: 'pass' | 'fail' | 'pending'
}

/** What the judge reads of a connector call that touched a reference. */
export type RefJudge = { tool: string; op: 'read' | 'write'; snippet: string }

/**
 * A PR, issue or link the session works on: its PRs (Claude Code's own pr-link records), what its
 * connector calls read or wrote that the judge kept, and the current branch's PR and issue.
 */
export type Reference = {
  /** Its link, and its identity: one reference per url. */
  url: string
  kind: RefKind
  /** Where it lives: `github`, `linear`, `slack`, a host. */
  service: string
  /** What the pane shows: `#6220`, `KOC-2124`, a Slack link's channel id, or a link's service, `slack`. */
  label: string
  title?: string
  status?: RefStatus
  /** The current branch's PR or issue: found again each refresh, and dropped from the store on load. */
  fromBranch?: boolean
  /** When the session last touched it, ms. */
  at: number
  /**
   * Set while the judge has not said whether the session works on it (it answered unsure, or failed):
   * what it needs to be asked again at every turn's end until it says. Drawn with a `?`.
   */
  judge?: RefJudge
}

declare module 'claude-code' {
  interface PluginState {
    cockpit: {
      fleet: FleetView
      /** The pane's scope toggle: true lists every session on the machine, false only this repo's. */
      allRepos: boolean
      snap: Snap
      /** The session's references, newest last; mirrored to `$.store` under `references:<session id>`, where the Sessions pane reads every session's. */
      references: Reference[]
    }
  }
}
