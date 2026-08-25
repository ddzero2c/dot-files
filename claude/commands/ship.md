---
description: Simplify, commit, push, open a PR, then loop-monitor it until merged (auto-resolving conflicts / fixing checks).
---

Ship the current work end to end:

1. Run `/simplify` to clean up the changed code, then commit it.
2. Push the branch and create a PR with `gh`.
3. `/loop` monitor the PR I just opened until it is merged — auto-resolve conflicts if needed, auto-fix failing checks.
4. Immediately after the PR is created, comment `@codex review` on it to request the first codex review.
5. Whenever the monitoring loop pushes new changes to the PR (conflict resolutions, check fixes, etc.), comment `@codex review` again so codex re-reviews the updated code.
