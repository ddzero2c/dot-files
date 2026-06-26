---
description: Simplify, commit, push, open a PR, then loop-monitor it until merged (auto-resolving conflicts / fixing checks).
---

Ship the current work end to end:

1. Run `/simplify` to clean up the changed code, then commit it.
2. Push the branch and create a PR with `gh`.
3. `/loop` monitor the PR I just opened until it is merged — auto-resolve conflicts if needed, auto-fix failing checks.
