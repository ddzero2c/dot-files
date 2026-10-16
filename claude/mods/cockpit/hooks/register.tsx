import type { Register } from 'claude-code'

import { registerUsage } from './usage'

// The usage band above the prompt, drawn with the bar in ./bar.
export const register: Register = (on, options) => {
  registerUsage(on, options)
}
