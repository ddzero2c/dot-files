# Handoff: cockpit mod (sessions-view 2026-10-06, merged 2026-10-08)

> 2026-10-08：`sessions-view` 和 `token-usage` 合併成 `claude/mods/cockpit/`，兩邊共用 `hooks/bar.ts` 的 bar（terminal 是 Raster、1/8 格填色；desktop 是圓角 SVG）。`/sessions-view` 指令和 pane id 沒改，state key 從 `sessions-view.*` / `token-usage.*` 改成 `cockpit.*`。下面 Sessions pane 的內容仍有效，路徑請看「結構」。

## 現況
- Sessions pane（`hooks/sessions.tsx`）是 Claude Code mod 的一部分 (plugin hooks module)，在 session 中開一個常駐的 "Sessions" pane，內容對應內建 agent view（← / `claude agents`）：這台機器上所有 Claude session（interactive + background）的 name / state / cwd / elapsed，blocked 的會顯示它在等什麼（`needs`）。
- 資料來源：每 2s 跑一次 `claude agents --json --cwd <repo root>`（約 0.13s），每列再用 `git -C <cwd> rev-parse --abbrev-ref HEAD` 拿 branch（快取 10s，detached 顯示 `@sha`，不在 repo 就退回目錄名），只列同一個 repo（含 `.claude/worktrees/` 下的 worktree）的 session；repo root 來自 `$.session.repo()`，沒有 repo 就用 cwd。帶 `--all`，已結束的 bg job 也列（在 FINISHED 區），因為那些是唯一能從這裡直接 `/resume` 進去的，background job 再讀 `~/.claude/jobs/<id>/state.json` 拿 `needs` / `detail`。
- **Scope 切換**：header 右邊的 `[repo]` / `[all]` 按鍵。`[all]` 時呼叫 `claude agents` 不帶 `--cwd`，列出整台機器的 session，meta 行多一段 repo 名（worktree 算進它的 parent repo）。狀態存在 `$.state` 的 `cockpit.allRepos`，hot reload 不會被重設；切換時清空清單、立刻重新 poll，切換當下還在跑的 poll 結果會被丟掉。
- 排序：needs input → running → idle/過渡 → finished。狀態對應（`tone()`）：
  - interactive `status`：`waiting` = ◆ needs input（permission / AskUserQuestion 在等你）、`busy` = ● busy、`shell` = ● running a command、`idle` = ○。
  - background `state`：`blocked` = ◆ needs input、`working` = ●、`starting/resuming/adopted/running` = ◌（過渡）、`crashed` = ✗ crashed · restarting（daemon 會重啟）、`done` = ✓、`failed` = ✗、`stopped` = ■。
  - `--json` 不給 `tempo` 和 interactive 的 `waitingFor`，所以 waiting 只能顯示「needs input」，看不到在等什麼。
- 目前 session 整塊（名稱、meta、context bar、連結）包在 `backgroundColor="userMessageBackground"` 的 Box 裡，跟自己訊息的底一樣；文字顏色、dim 都保留。試過 `inverse`，glyph 會變色塊、dim 字糊成灰上灰，不好看。
- background job 的 PR / issue（state.json `children`）獨立一行，在 meta 行下面，用 `Markdown` 畫成 `[#6220](url)`，樣式跟 assistant 回覆裡的連結一樣。單擊經 `onLinkPress` 回到 plugin，用 `open` 開瀏覽器，不靠 OSC 8（tmux 沒開 hyperlinks feature）。未驗證 Markdown 連結會不會進焦點環；如果不會，就只能用滑鼠點，不能用 Enter 開。
- **不碰 tmux。** 點列或 Enter：已結束的 session（bg 的 done / failed / stopped）用 `$.command.run({ command: 'resume', args: sessionId })` 跑內建 `/resume`，在這個 terminal 直接切進那段對話，跟 agents view 的 Enter 一樣；還活著的（interactive，或 worker 還在的 bg job）engine 會拒絕 resume（「already open in another running Claude session」），所以改成複製 `claude attach <id>` / `claude --resume <sessionId>` 並 toast。agents view 對活著的 bg job 能 attach 是因為它自己是 terminal 前景程式，mod 在 session 裡做不到。
- 其他 interactive session 的列會標在哪跑：讀 `~/.claude/sessions/<pid>.json`，有 `tmux` 欄位顯示 `tmux <session>:<window>.<pane>`，entrypoint 是 vscode / desktop 各自顯示，否則 `another terminal`。
- 原本追 `agent.spawn` / `tool.call` 的 subagent 版本已經改掉（2026-10-06）。
- 載入方式：`~/.claude/settings.json` (symlink 到 `claude/settings.json`) 的 `env.CLAUDE_CODE_PLUGIN_DIRS` 指向 `~/repo/dot-files/claude/mods/cockpit`。
- `claude plugin validate claude/mods/cockpit`、`claude plugin test claude/mods/cockpit` 檢查。
- `.gitignore` 已加 `claude/mods/*/.claude-plugin/types/`（engine 每次載入自動生成，不進 git）。
- 以上變更尚未 commit。`tmux.conf` 的改動與此無關，是之前就有的。

## 這次修了什麼
- 原本的 `sessions-view-dock` mod 呼叫 `$.command.run({ command: 'sessions-view' })`，以為是 built-in command。
- 查過 Claude Code 2.1.290 binary，沒有 `/sessions-view`。它是 `sessions-view` mod 自己 `$.command.register` 的，而那個 mod 只存在於 `~/.claude/dev-mods/a2e6e4ed-.../`，沒被載入。
- 所以 command 不存在 → reject → toast 噴錯。
- 處理：把 `sessions-view` 整個搬進 dot-files，刪掉 dock，改 `CLAUDE_CODE_PLUGIN_DIRS`。

## 清單是一個 Client（滑鼠操作）
- `hooks/fleet-list.tsx` 是 surface module（`ClientModule`），跑在 drawing thread，沒有 `$`；hooks module 在 `ui.render` 用 `<Client key="list" module="./fleet-list.tsx" props={{ rows, summary, empty }} />` 把算好的純資料丟給它，它用 `surface.post` 回傳 `{ type: 'activate', key }` / `{ type: 'open', href }`，hooks module 在 `ui.message{element=list}` 接。
- 滑鼠：點任一行等於 Enter，點 PR 行的 `#號碼` 開 PR。
- **ctrl-k 是側欄 focus 的 toggle**：`claude/keybindings.json`（symlink 到 `~/.claude/keybindings.json`）在 Chat context 把 ctrl+k → `abovePrompt:focus`，在 Pane context 把 ctrl+k → `abovePrompt:leave`。啟動時讀，改了要重啟 session。
- 側欄有焦點時（Client 的 `onKey`）：只接 ↑ ↓ 上下移游標（不綁 j/k 等字母鍵），Enter 對游標那列做上面的複製；游標列開頭 `>`，第一次停在自己那列。Esc 也會回 prompt。
- 每列第三行是 context bar `sonnet 5.5 ██████░░░░░░░░░░░░░░`（前面是 model 短名，`claude-fable-5-1` → `fable 5.1`、自己的 `fable[1m]` → `fable 1m`；20 格，<50 綠、<80 黃、≥80 紅；不顯示百分比）。自己這個 session 用 `$.session.usage()` 即時拿；其他 session 用 `tail -c 262144` 讀 `~/.claude/projects/<cwd 的 / 和 . 換成 ->/<sessionId>.jsonl` 最後一筆 assistant 的 usage（input + cache_read + cache_creation），window 照 engine 的 model 表：fable / mythos / opus ≥4.7 / sonnet ≥5 原生 1M，其他 200k，`[1m]` 後綴一律 1M（model id 本身看不出 1M，之前用 id 猜 200k 會算出 100%）。**compaction 後 transcript 會換檔**：舊檔最後一筆 `{"type":"continued-in","continuedInSessionId":...}` 指向新檔，而 `claude agents --json` 仍報原 sessionId，所以 `contextOf()` 會沿 continued-in 鏈走（最多 6 跳），不然 bar 會停在 compaction 前的數字。
- 清單分四區，各有 dim 粗體大寫標題：NEEDS INPUT / RUNNING / IDLE / FINISHED，區之間空一行。
- `surface.columns` / `surface.rows` 第一次 layout 前是 0，module 裡當 200 處理，不然會把內容截掉（測試就是這樣炸的）。
- 測試看 Client 內容要加 scope：`ui.find({ ..., in: 'list' })`、`ui.pointer({ type: 'down', x, y, button: 'left', in: 'list' })`。

## 結構
```
claude/mods/cockpit/
  .claude-plugin/plugin.json   # name, types 路徑, author
  hooks/hooks.json             # { "modules": ["./register.tsx"] }
  hooks/register.tsx           # 入口：registerUsage + registerSessions
  hooks/usage.tsx              # prompt 上方的 band：5h / 7d、token、花費（session.measure / turn.complete）
  hooks/sessions.tsx           # Sessions pane：session.start 開 pane + 2s 輪詢、/sessions-view
  hooks/bar.ts                 # 兩邊共用的 bar：門檻與顏色、barCells（Raster）、barRects（SVG）、pack
  hooks/text.ts                # CJK 寬度 / 截斷 / 補空白 helper
  types/index.d.ts             # PluginState['cockpit'] 的型別契約
  tests/{usage,sessions,bar}.test.ts, tests/raster.ts（解碼 Raster cells 的 test helper）
  tsconfig.json                # extends ./.claude-plugin/types/tsconfig.json（載入後才會生成）
```
- 同一個 plugin 對同一個事件只能掛一個沒 matcher 的 hook，且 `$` 不能傳進 import 來的函式，所以 `session.start` 只在 `sessions.tsx`。它每 2s 的 `$.ui.invalidate('ui.render')` 也會重畫 usage band，band 不另外設計時器。

## 注意事項
- **位置不能選左邊。** Mod API 的 `$.ui.open` 沒有 side 參數，pane 由 engine 安排：main screen（`/tui default`，tmux 預設）放在 prompt 上方 inline；fullscreen（`/tui fullscreen`）才 dock 在 transcript 旁邊，而 dock 是右側（layout 裡 `sidebar` 左槽是內建 agent view 專用、`dock` 右槽給 plugin）。要像 sidebar 就得切 fullscreen。
- Pane 從 `session.start` 自動開啟算 unasked，terminal 要 ≥144 columns 才會畫；手動打 `/sessions-view` 任何寬度都開。
- 初始寬度是 terminal 的 20%（最少 28 格）。沒有 API 直接問 terminal 寬度，所以 `session.start` 先不帶寬度開，第一次 `ui.render` 拿 `e.viewport.columns` 再 `$.ui.open({ columns })` 一次；`/sessions-view` 用 `e.presentation.columns`。只在 fullscreen dock 有效（inline 不吃 columns），之後使用者自己拖的寬度優先。
- 測試裡要 mock `ui.open`、`process.run`、`fs.read`、`session.id`、`env.get`，回傳格式是 `{ value: ... }`。
- 改檔案後 session 會 hot reload；`register` 重跑、module 變數歸零，`$.state` 保留。
- Debug：`claude --debug`，hook 失敗會在 transcript 出現一行 dim 的 `cockpit: <event> ...`。
- Mod API 型別在 `claude/mods/cockpit/.claude-plugin/types/claude-code/index.d.ts`，寫 hook 前 grep 它；或 Skill `plugin-authoring`。

## 下一步（可選）
- commit：`.gitignore`、`claude/settings.json`、`claude/mods/sessions-view/`。
- `~/.claude/dev-mods/` 下的舊 `sessions-view` 和 `sessions-view-dock` 草稿可以刪。
- 要分享的話加 `.claude-plugin/marketplace.json`，之後 `/plugin install cockpit --marketplace ddzero2c/dot-files`。
