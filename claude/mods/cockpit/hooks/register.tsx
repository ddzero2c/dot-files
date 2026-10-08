import type { Register } from 'claude-code'

import { registerSessions } from './sessions'
import { registerUsage } from './usage'

// Two instruments sharing one bar (./bar): the usage band above the prompt and the Sessions pane.
export const register: Register = (on, options) => {
  registerUsage(on, options)
  registerSessions(on, options)
}
