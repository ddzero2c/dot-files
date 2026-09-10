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

Then output in this exact format (Traditional Chinese, technical terms in English). The output is pasted straight into Slack, so use ONLY characters that survive a plain-text paste into Slack's composer: no markdown/mrkdwn markup at all (no `*`, `_`, `#`, `-` list markers — Slack will not convert them and may mangle them), emoji-prefixed headers, literal unicode bullets `•` / `◦`, and do NOT wrap the result in a code fence — print it as plain text:

```
🗓 昨天
• KOC-1234 短標題 ✅ merged #5667 #5670
    ◦ 一行補充（只在需要脈絡時）
• KOC-1235 短標題 🔧 進行中 · 做了什麼，未 commit
• 主題（無票號）✅ merged #5680 · 一句話說改了什麼
• KOC-1236 短標題 ❌ PR #5453 關閉未 merge

🎯 今天
⚡ 要決定 / 卡人
• KOC-1236 一句話說現況 → 具體動作（要找誰）
📦 收尾
• KOC-1235 具體動作
👀 順手
• 來源：一句話
```

Formatting rules — follow all of them:

**每一行的結構**（昨天）: `票號 短標題 狀態 PR號 · 補充`
- 票號在最前面（KOC-xxxx）；沒有票號就用 2–4 字的主題名。
- 短標題 ≤ 8 個字，是功能名不是句子。
- 狀態只能用這四個：✅ merged、🔧 進行中、❌ 關閉、🧹 雜務。狀態緊接在短標題後面。
- PR 號放在狀態之後，一律 `#1234` 形式，多個用空格分開。
- 補充用 ` · ` 分隔，一句話，說「改了什麼」不說「為什麼」。
- sub-bullet 用四個空格 + `◦`，最多一層、最多一行，只在 PR 內容一行講不完時使用。
- 同一票的多個 PR 合併成一項，不要每個 PR 一項。

**今天** 固定分三層，順序不變，沒有內容的層級直接省略標題：
- ⚡ 要決定 / 卡人：需要做決策、需要找人對齊、或有人在等我的。每項末尾用 `→` 接具體動作，要找的人直接寫名字。
- 📦 收尾：昨天沒做完、上線後驗證、要開/要更新的 PR 或 Linear 票。
- 👀 順手：告警、舊 PR、可以不做但看到了的事。以 `來源：` 開頭（例：`Firebase：`、`舊 PR：`）。
- 每項一行，以動詞結尾的具體動作（commit、開 PR、開 flag、找 Ken 對齊），不要寫「注意」「看看」這種模糊詞。
- 同一票的事寫在一起，不要跨層重複。

**通用**
- 標題只有 `🗓 昨天` 和 `🎯 今天` 兩個，用 emoji 開頭，不用 `*…*` 粗體（Slack 貼上不會轉，中文旁的 `*` 還會變成 emoji）。⚡📦👀 三個層級標題也是純文字。項目符號一律用 `•`，不要用 markdown 的 `-`。
- 每行盡量 ≤ 40 個中文字（不含票號、PR 號），超過就砍補充，不要換行續寫。
- 「昨天」= completed/progressed work, grouped by project or topic, not by source.
- Deduplicate across sources (a PR seen in both gh and email is one item). Don't pad — if a source has nothing, omit it silently.
- Only list work I authored: PRs from `gh search prs --author=@me` or commits from `git log --author`; a commit appearing in main's log is not evidence I did it — verify the PR author before including anything.
