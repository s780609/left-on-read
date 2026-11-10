# 已讀不回 — Claude Code Game Studios

<!-- 2026-11-10 從 Claude Code Game Studios 1.3.0 導入。下面這一行載入這個專案原本的規則（Next.js 警告、交接文件），要保留在最前面。 -->
@AGENTS.md

## 這個專案的設定（優先於下面範本的預設）

- `project.yaml`：`modes.rigor: minimal`、`modes.automation: autonomous`、`engine.name: Web`、`project.stage: Production`
- 設計紀錄是 `design/game-brief.md`（minimal 不要求 GDD）；完整規則、進度和歷次改動仍以 `GROK_HANDOFF.md` 為準
- 擁有者的工作方式（2026-11 起）：改好、測過（`npm test`、`npm run lint`、`npx tsc --noEmit`、`npm run build`）就直接 commit 並推上 `main`，不用每步先問。只有 `modes.automation_always_ask` 的類別、或會改變遊戲方向的大決定才停下來問
- 下面「Collaboration Protocol」裡「寫檔前先問」「沒有指示不 commit」是範本給 `collaborative` 模式的預設；本專案是 `autonomous`，照 `.claude/docs/automation-modes.md` 的 autonomous 規則：自己決定、把決定記在 `production/session-state/active.md`、照做
- 對白：原創、繁體中文、台灣用語；交友 App 叫 Swipy；所有女角都是成年人

---

# Claude Code Game Studios -- Game Studio Agent Architecture

Indie game development managed through 49 coordinated Claude Code subagents.
Each agent owns a specific domain, enforcing separation of concerns and quality.

## Technology Stack

- **Engine**: Web — Next.js 16 (App Router), React 19, Tailwind CSS v4, Serwist PWA
- **Language**: TypeScript
- **Version Control**: Git with trunk-based development
- **Build System**: `npm run build`（`npm test`、`npm run lint`、`npx tsc --noEmit` 都要過）
- **Asset Pipeline**: 插圖放在 `public/left-on-read/`，在 `src/components/original/pixel/scenes.ts` 的 `PHOTO_SRC` 登記；遊戲邏輯在 `src/lib/left-on-read/`（純函式，不碰 React／DOM）

> **Note**: Engine-specialist agents exist for Godot, Unity, and Unreal with
> dedicated sub-specialists. Use the set matching your engine.

## Project Structure

@.claude/docs/directory-structure.md

## Engine Version Reference

<!-- ENGINE-REFERENCE-IMPORT: the line under this comment is engine-specific,
     and there is none until an engine is set. /setup-engine, the grow's record
     step and /project-settings (engine.name) write
     @docs/engine-reference/<engine>/VERSION.md here for the chosen engine. Skills
     that need the pinned version read that file on demand either way. -->
@docs/engine-reference/web/VERSION.md


## Technical Preferences

`project.yaml` at the repo root is the primary config store — engine, specialists,
naming, platform, performance, modes. Skills resolve it via `resolve_config`
(see `.claude/docs/config-resolution.md`).

`.claude/docs/technical-preferences.md` is the **legacy fallback**, read on demand
when a key is absent from `project.yaml`. It is not imported here: before
`/setup-engine` runs it is almost entirely `[TO BE CONFIGURED]` placeholders, and
after it runs `project.yaml` holds the real values.

## Coordination Rules

@.claude/docs/coordination-rules.md

## Collaboration Protocol

**User-driven collaboration, not autonomous execution.**
Every task follows: **Question -> Options -> Decision -> Draft -> Approval**

- Agents MUST ask "May I write this to [filepath]?" before using Write/Edit tools
  (exempt: `active.md` appends, agent memory, a subagent's new file at the path
  its orchestrating skill named; see `.claude/rules/agent-memory.md`)
- Agents MUST show drafts or summaries before requesting approval
- Multi-file changes require explicit approval for the full changeset
- No commits without user instruction
- A skipped or dismissed question is not an answer: act on nothing, re-ask in
  plain text and wait
- Started outside this file's folder? Warn first: hooks, deny rules and the
  ask-first mode load only when Claude Code starts here

See `docs/COLLABORATIVE-DESIGN-PRINCIPLE.md` for full protocol and examples.

> **First session?** Say "make me a game" (`/prototype`), or run `/start` to begin
> the guided onboarding flow.

## Coding Standards

@.claude/docs/coding-standards.md

## Context Management

Read `.claude/docs/context-management.md` on demand — it is a reference, not
session context. Two of its conventions are load-bearing and cited by name
elsewhere in the repo, so they are restated here rather than lost:

- **`production/session-state/active.md` is the session checkpoint.** The file is
  the memory, not the conversation. Read it first after any compaction, crash, or
  `/clear`.
- **Helpers in `.claude/scripts/` emit observations, never verdicts.** A script
  that scores or judges will eventually contradict a mode or override it cannot
  see. (Cited by `artifact-check.sh` and `adr-dep-graph.sh`.)
