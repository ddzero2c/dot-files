export type Win = { used: number; resetsAt?: string }
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
    'token-usage': { snap: Snap; tick: number }
  }
}
