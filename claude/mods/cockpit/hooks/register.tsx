import type { Register } from 'claude-code'

import { registerReferences } from './references'
import { registerSessions } from './sessions'
import { registerUsage } from './usage'

// The instruments, sharing one bar (./bar): the usage band above the prompt, and the Sessions pane with
// each session's references (./references keeps this session's).
export const register: Register = (on, options) => {
  registerUsage(on, options)
  registerReferences(on, options)
  registerSessions(on, options)
}
