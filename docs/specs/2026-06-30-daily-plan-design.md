# Obsidian Daily Plan Plugin — Design Spec

**Date**: 2026-06-30
**Status**: Approved

## Overview

An Obsidian plugin that provides an interactive daily planning table inside Markdown notes. Data is stored as YAML inside a fenced code block (` ```daily-plan`), keeping the `.md` file fully self-contained and readable without the plugin.

## Trigger Methods

1. **Command Palette** — `Ctrl+P` → "Insert today's daily plan"
2. **Ribbon Icon** — Calendar-date icon in the left sidebar ribbon

Both trigger the same logic:
- If the current file already contains a ` ```daily-plan` block → scroll to it
- If not → insert a template: `### YYYY-MM-DD 周X` heading + empty ` ```daily-plan` block with one blank task row

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
  - "Fill current time" button (default)
  - Manual HH:mm input field
- **Auto-compute duration** — whenever start or end changes, duration column recalculates
- **Done toggle** — click Y/N badge to flip state
- **Add row** — "+" button at table bottom
- **Delete row** — trash icon on each row
- **Auto-save** — every change serializes YAML back into the code block via editor API

## Time Handling
- Format: 24-hour (`HH:mm`)
- Duration: minutes subtraction → `Xh Ym` display
- Empty start or end → duration displays `—`

## Architecture

```
main.ts          — Plugin lifecycle, register command + ribbon + post-processor
settings.ts      — Plugin settings tab (future: default time format, etc.)
processor.ts     — MarkdownPostProcessor: find ```daily-plan blocks, render table
table-renderer.ts — Build interactive HTML table from parsed YAML, attach event handlers
yaml-utils.ts    — Parse/serialize YAML, read/write code block content in editor
time-utils.ts    — Format current time, compute duration
manifest.json    — Obsidian plugin manifest
styles.css       — Table + popup styling
```

## Dependencies
- `obsidian` (API types — dev dependency)
- `js-yaml` (YAML parse/stringify)
- TypeScript + esbuild (build)

## Installation for User

1. Copy plugin folder to `<vault>/.obsidian/plugins/obsidian-daily-plan/`
2. Enable "Daily Plan" in Settings → Community Plugins
3. Use ribbon icon or Ctrl+P → "Insert today's daily plan"
