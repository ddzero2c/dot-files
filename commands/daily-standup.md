---
description: Summarize yesterday's work and today's plan from GitHub PRs, Linear, email, and Claude Code sessions.
---

Generate my daily standup: what I did yesterday, and what I should handle today.

Define "yesterday" as the previous working day: on Monday that means last Friday (and fold in any weekend activity under the same「昨天」section). Use `date` to compute the actual dates first.

Gather from these sources in parallel:

1. **GitHub** (via `gh`): PRs I created, updated, merged, or reviewed since yesterday; review comments I received; PRs still open that are assigned to me or awaiting my review. Check `gh search prs --author=@me`, `gh search prs --review-requested=@me`, and recent commits on my active branches.
2. **Email** (via Gmail tools): threads from yesterday onward that involve me and look actionable or work-related — meetings, requests, reviews, incidents. Skip newsletters and automated noise (but keep CI/alert emails that need action).
3. **Linear** (via Linear tools): issues assigned to me — status changes, comments, and new assignments since yesterday; issues currently in progress or in my current cycle that are candidates for today. Cross-reference issue IDs (e.g. KOC-xxxx) with the PRs found above.
4. **Claude Code sessions**: look at `~/.claude/projects/*/` for session activity since yesterday (file mtimes are enough to tell which projects were active); combine with recent git log across those repos (`git log --author --since`) to see what was actually worked on.

Then output in this exact format (Traditional Chinese, terse bullet points; sub-bullets only when a one-liner needs context):

```
昨天
- xxx
  - xxx 補充說明
- yyy
- ...

今天
- zzz 補充說明
- ...
```

「昨天」= completed/progressed work, grouped by project or topic, not by source.
「今天」= concrete next actions: unfinished work from yesterday, PRs awaiting my fixes or reviews, actionable emails, upcoming deadlines. Prioritize items that block others.

Deduplicate across sources (a PR seen in both gh and email is one item). Don't pad — if a source has nothing, omit it silently.
