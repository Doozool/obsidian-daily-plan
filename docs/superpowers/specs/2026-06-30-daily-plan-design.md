# Obsidian Daily Plan Plugin — Design Spec

**Date**: 2026-06-30
**Status**: Approved

## Overview

An Obsidian plugin that provides an interactive daily planning table inside Markdown notes. Data is stored as YAML inside a fenced code block (` ```daily-plan`), keeping the `.md` file fully self-contained and readable without the plugin.

## Trigger Methods

1. **Command Palette** — `Ctrl+P` → "Insert today's daily plan"
2. **Ribbon Icon** — Calendar-date icon in the left sidebar ribbon

Both trigger the same logic:
- If the current file already contains a ` ```daily-plan` block → scroll to the first one
- If not → insert a template at cursor position: `### YYYY-MM-DD 周X` heading + empty ` ```daily-plan` block with one blank task row

### Multiple Blocks Per File

Allowed (e.g., weekly notes with one block per day):
- **Insert** always places the new block at cursor position
- **Command/ribbon trigger** scrolls to the first existing block if any exist
- If multiple blocks exist, the first one in document order is the scroll target

## Storage Format (YAML inside code block)

````markdown
### 2026-06-30 周二

```daily-plan
tasks:
  - name: 写周报
    start: "14:30"
    end: "15:45"
    done: Y
  - name: 代码评审
    start: ""
    end: ""
    done: N
```
````

### Field Mapping

| Table Column | YAML Field | Behavior |
|---|---|---|
| 任务 | `name` | Editable text input |
| 开始时间 | `start` | Click to open picker: auto-fill current time or manual input (HH:mm) |
| 结束时间 | `end` | Same as start |
| 总用时 | *(computed)* | `end - start`, displayed as `Xh Ym`, read-only |
| 完成 | `done` | Click to toggle `Y` ↔ `N` |

## Interactive Table

Rendered as a custom HTML table via Obsidian's `MarkdownPostProcessor` API, replacing the static code block display.

### Features
- **Inline task name editing** — click cell, type, blur to save
- **Time picker popup** — click start/end cell → small panel with:
  - "Fill current time" button (auto-fills `HH:mm` from `new Date()`)
  - Manual HH:mm text input field with confirm button
- **Auto-compute duration** — whenever start or end changes, duration column recalculates
- **Done toggle** — click Y/N badge to flip state
- **Add row** — "+" button at table bottom
- **Delete row** — trash icon on each row
- **Auto-save** — every change serializes YAML back into the code block via `editor.replaceRange()`

## Time Handling
- Format: 24-hour (`HH:mm`)
- Duration: minutes subtraction → `Xh Ym` display
- Empty start or end → duration displays `—`

## Edge Cases

| Scenario | Behavior |
|---|---|
| Empty `start` or `end` | Duration column shows `—` |
| Missing `tasks` array | Render empty table with one blank row |
| Code block removed externally | Processor detects no block, renders nothing (no orphan DOM) |
| YAML parse failure | Gracefully fall back to raw code block display |
| Multiple daily-plan blocks | All rendered; command scrolls to first; insert at cursor |

## Architecture

```
main.ts          — Plugin lifecycle, register command + ribbon + post-processor
settings.ts      — Plugin settings tab (future: default time format, etc.)
processor.ts     — MarkdownPostProcessor: find ```daily-plan blocks, render table
table-renderer.ts — Build interactive HTML table from parsed YAML, attach event handlers
yaml-utils.ts    — Parse/serialize YAML, read/write code block content via editor.replaceRange()
time-utils.ts    — Format current time (HH:mm), compute duration between two times
manifest.json    — Obsidian plugin manifest
styles.css       — Table + popup styling
```

### Data Flow

```
Markdown code block (YAML text)
  → yaml-utils.ts parses into Task[]
  → table-renderer.ts builds interactive HTML table
  → user interacts (edit / click / toggle)
  → yaml-utils.ts serializes Task[] back to YAML string
  → editor.replaceRange() writes updated YAML into code block
  → MarkdownPostProcessor re-renders automatically
```

### Component Responsibilities

- **main.ts**: Plugin lifecycle (`onload` / `onunload`). Registers the command (with editor callback), ribbon icon, and `MarkdownPostProcessor`. On command/ribbon trigger: scan for existing blocks, insert template or scroll.
- **settings.ts**: Registers a settings tab via `addSettingTab()`. Initial version may be minimal (placeholder); future: default time format toggle.
- **processor.ts**: Registered via `MarkdownPostProcessor`. Matches ` ```daily-plan` code blocks using a regex on the element's text content. For each match, parses YAML via `yaml-utils.ts` and replaces the code block DOM with the interactive table from `table-renderer.ts`.
- **table-renderer.ts**: Pure DOM builder. Takes parsed `Task[]` and a callback `onChange(tasks)` that writes back to the editor. Constructs an HTML table with inline editing (contenteditable), time picker popups (absolute-positioned div), done toggle buttons, add-row and delete-row handlers. Each change calls `onChange` with the updated task array.
- **yaml-utils.ts**: `parseYaml(text: string): Task[]` using `js-yaml`. `serializeYaml(tasks: Task[]): string` produces clean YAML. `updateCodeBlock(editor: Editor, blockStart: number, blockEnd: number, newContent: string)` writes via `editor.replaceRange()`.
- **time-utils.ts**: `getCurrentTime(): string` returns `HH:mm`. `computeDuration(start: string, end: string): string | null` returns `"Xh Ym"` or `null`.

## Dependencies
- `obsidian` (API types — dev dependency, bundled by Obsidian at runtime)
- `js-yaml` (YAML parse/stringify — npm dependency, bundled via esbuild)
- TypeScript + esbuild (build tooling)

## Build Setup

Based on [obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin) template:
- `esbuild.config.mjs` — bundles `main.ts` → `main.js` with `js-yaml` inlined
- `tsconfig.json` — strict TypeScript, ES2022 target
- Hot-reload via the Hot Reload community plugin (optional, dev convenience)

## Installation for User

1. Copy plugin folder to `<vault>/.obsidian/plugins/obsidian-daily-plan/`
2. Enable "Daily Plan" in Settings → Community Plugins
3. Use ribbon icon or Ctrl+P → "Insert today's daily plan"
