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
  /** What a working job says it is doing (its state.json `detail`). */
  detail?: string
  /** Linked artifacts the job reported (its state.json `children`): PRs, issues. */
  links: FleetLink[]
  /** Context window use: tokens in the last request and the window they count against. */
  context?: { tokens: number; window: number; model?: string }
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

declare module 'claude-code' {
  interface PluginState {
    'sessions-view': {
      fleet: FleetView
      /** The pane's scope toggle: true lists every session on the machine, false only this repo's. */
      allRepos: boolean
    }
  }
}
