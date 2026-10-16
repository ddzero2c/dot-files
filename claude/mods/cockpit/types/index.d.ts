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

declare module 'claude-code' {
  interface PluginState {
    cockpit: {
      snap: Snap
    }
  }
}
