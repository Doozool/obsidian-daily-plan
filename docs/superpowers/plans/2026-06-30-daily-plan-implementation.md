# Daily Plan Obsidian Plugin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Obsidian plugin that renders interactive daily-planning tables from YAML inside ` ```daily-plan` fenced code blocks, with inline editing, time pickers, and auto-save.

**Architecture:** 7 source files rooted at project top-level. `main.ts` is the plugin entry point that registers a command, ribbon icon, and a `MarkdownCodeBlockProcessor`. The processor in `processor.ts` parses YAML via `yaml-utils.ts`, builds an interactive HTML table via `table-renderer.ts`, and writes changes back to the editor. `time-utils.ts` provides pure time-formatting helpers. `settings.ts` provides a settings tab.

**Tech Stack:** TypeScript, esbuild, Obsidian API (dev dependency), js-yaml (npm dependency bundled via esbuild).

## File Structure

```
obsidian-daily-plan/
├── main.ts              # Plugin entry: lifecycle, command, ribbon
├── settings.ts          # Settings tab
├── processor.ts         # CodeBlockProcessor: parse YAML → render table
├── table-renderer.ts    # Build interactive DOM table + event handlers
├── yaml-utils.ts        # YAML parse/serialize, editor write-back
├── time-utils.ts        # Current time formatter, duration calculator
├── types.ts             # Shared TypeScript interfaces
├── manifest.json        # Obsidian plugin manifest
├── styles.css           # Table + time-picker popup styles
├── package.json         # npm deps & scripts
├── tsconfig.json        # TypeScript config
└── esbuild.config.mjs   # esbuild bundle config
```

## Global Constraints

- Target: Obsidian API (dev dependency — NOT bundled)
- Runtime dep: `js-yaml` — npm installed, bundled by esbuild into `main.js`
- Build: esbuild bundles `main.ts` → `main.js`; `styles.css` and `manifest.json` copied to vault plugin dir
- TypeScript strict mode, ES2022 target
- Time format: 24-hour `HH:mm`; duration as `"Xh Ym"`
- Editor write-back via `editor.replaceRange()`, not `Vault.modify()`
- Use `registerMarkdownCodeBlockProcessor("daily-plan", ...)` for rendering
- Support multiple ` ```daily-plan` blocks per file

---

### Task 1: Project Scaffolding & Shared Types

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `esbuild.config.mjs`
- Create: `manifest.json`
- Create: `types.ts`

**Interfaces:**
- Consumes: nothing (first task)
- Produces:
  - `Task { name: string; start: string; end: string; done: "Y" | "N" }` exported from `types.ts`
  - `DailyPlanData { tasks: Task[] }` exported from `types.ts`
  - `DailyPlanSettings { }` interface exported from `types.ts`
  - `DEFAULT_SETTINGS: DailyPlanSettings` constant exported from `types.ts`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "obsidian-daily-plan",
  "version": "1.0.0",
  "description": "Interactive daily planning table for Obsidian",
  "main": "main.js",
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production"
  },
  "dependencies": {
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "obsidian": "latest",
    "typescript": "^5.4.0",
    "esbuild": "^0.20.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `cd d:/codevs/obsidian-daily-plan && npm install`
Expected: dependencies install without errors

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "outDir": "./",
    "rootDir": "./",
    "baseUrl": ".",
    "inlineSource": true,
    "inlineSourceMap": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["*.ts"]
}
```

- [ ] **Step 4: Write `esbuild.config.mjs`**

```javascript
import esbuild from "esbuild";
import process from "process";

const prod = process.argv[2] === "production";

const context = await esbuild.context({
  entryPoints: ["main.ts"],
  bundle: true,
  external: ["obsidian"],
  format: "cjs",
  target: "ES2022",
  platform: "browser",
  outfile: "main.js",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  logLevel: "info",
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
```

- [ ] **Step 5: Write `manifest.json`**

```json
{
  "id": "obsidian-daily-plan",
  "name": "Daily Plan",
  "version": "1.0.0",
  "minAppVersion": "1.5.0",
  "description": "Interactive daily planning table inside Markdown notes",
  "author": "Your Name",
  "isDesktopOnly": false
}
```

- [ ] **Step 6: Write `types.ts`**

```typescript
export interface Task {
  name: string;
  start: string;
  end: string;
  done: "Y" | "N";
}

export interface DailyPlanData {
  tasks: Task[];
}

export interface DailyPlanSettings {
  // Future: default time format, etc.
}

export const DEFAULT_SETTINGS: DailyPlanSettings = {};
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: May show "Cannot find module" errors for files not yet created — that's OK at this stage. `types.ts` alone should have zero errors.

---

### Task 2: Time Utilities

**Files:**
- Create: `time-utils.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `getCurrentTime(): string` — returns `HH:mm` (e.g. `"14:30"`)
  - `computeDuration(start: string, end: string): string | null` — returns `"Xh Ym"` or `null` if either input is empty/invalid

- [ ] **Step 1: Write `time-utils.ts`**

```typescript
/**
 * Returns the current time formatted as HH:mm (24-hour).
 */
export function getCurrentTime(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Parses a HH:mm string into total minutes since midnight.
 * Returns NaN if the format is invalid.
 */
function parseMinutes(time: string): number {
  if (!/^\d{2}:\d{2}$/.test(time)) return NaN;
  const [h, m] = time.split(":").map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return NaN;
  return h * 60 + m;
}

/**
 * Computes the duration between two HH:mm times.
 * Returns a human-readable string like "1h 30m", or null
 * if either input is empty or invalid.
 */
export function computeDuration(start: string, end: string): string | null {
  if (!start || !end) return null;

  const startMin = parseMinutes(start);
  const endMin = parseMinutes(end);

  if (isNaN(startMin) || isNaN(endMin)) return null;
  if (endMin <= startMin) return null;

  const diff = endMin - startMin;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: No errors in `time-utils.ts`

---

### Task 3: YAML Utilities

**Files:**
- Create: `yaml-utils.ts`

**Interfaces:**
- Consumes: `Task`, `DailyPlanData` from `types.ts`; `js-yaml` npm package
- Produces:
  - `parseDailyPlanYaml(source: string): Task[]` — parses YAML inside code block, returns tasks array. Returns `[]` on parse failure or missing tasks.
  - `serializeDailyPlanYaml(tasks: Task[]): string` — serializes tasks array to YAML string.
  - `findCodeBlockRange(editor: Editor): { start: EditorPosition; end: EditorPosition } | null` — locates the first ` ```daily-plan` code block boundaries in the editor.
  - `updateCodeBlock(editor: Editor, newYaml: string): void` — replaces code block content with new YAML.

- [ ] **Step 1: Write `yaml-utils.ts`**

```typescript
import { dump, load } from "js-yaml";
import { Editor, EditorPosition } from "obsidian";
import type { DailyPlanData, Task } from "./types";

const BLOCK_MARKER = "```daily-plan";
const BLOCK_END = "```";

/**
 * Parse YAML source from a daily-plan code block.
 * Returns the tasks array, or an empty array on failure.
 */
export function parseDailyPlanYaml(source: string): Task[] {
  try {
    const data = load(source) as DailyPlanData | null;
    if (data && Array.isArray(data.tasks)) {
      return data.tasks.map((t: Record<string, unknown>) => ({
        name: typeof t.name === "string" ? t.name : "",
        start: typeof t.start === "string" ? t.start : "",
        end: typeof t.end === "string" ? t.end : "",
        done: t.done === "Y" ? "Y" : "N",
      }));
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Serialize an array of tasks to a YAML string with a `tasks:` key.
 */
export function serializeDailyPlanYaml(tasks: Task[]): string {
  const data: DailyPlanData = { tasks };
  const yaml = dump(data, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });
  // Remove the leading "tasks:" line's trailing newline for clean look
  return yaml.trimEnd();
}

/**
 * Find the range (start and end positions) of the first ```daily-plan
 * code block in the editor. Returns null if no block is found.
 */
export function findCodeBlockRange(editor: Editor): {
  start: EditorPosition;
  end: EditorPosition;
} | null {
  const content = editor.getValue();
  const startIdx = content.indexOf(BLOCK_MARKER);

  if (startIdx === -1) return null;

  // Position right after the marker (on the next line)
  const contentStart = content.indexOf("\n", startIdx);
  if (contentStart === -1) return null;

  // Find the closing ```
  const endIdx = content.indexOf("\n" + BLOCK_END, contentStart);
  if (endIdx === -1) return null;

  return {
    start: editor.offsetToPos(contentStart + 1), // first char after newline
    end: editor.offsetToPos(endIdx + 1),          // first char of closing ``` line
  };
}

/**
 * Replace the content inside the first ```daily-plan code block
 * with the given YAML string.
 */
export function updateCodeBlock(editor: Editor, newYaml: string): void {
  const range = findCodeBlockRange(editor);
  if (!range) return;

  editor.replaceRange(newYaml, range.start, range.end);
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: No errors in `yaml-utils.ts`

---

### Task 4: Settings

**Files:**
- Create: `settings.ts`

**Interfaces:**
- Consumes: `DailyPlanSettings`, `DEFAULT_SETTINGS` from `types.ts`; `Plugin` from `obsidian`
- Produces: `DailyPlanSettingTab` class (extends `PluginSettingTab`)

- [ ] **Step 1: Write `settings.ts`**

```typescript
import { App, PluginSettingTab, Setting } from "obsidian";
import type DailyPlanPlugin from "./main";

export class DailyPlanSettingTab extends PluginSettingTab {
  plugin: DailyPlanPlugin;

  constructor(app: App, plugin: DailyPlanPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Daily Plan Settings" });

    new Setting(containerEl)
      .setName("Daily Plan")
      .setDesc("Settings for the Daily Plan plugin will appear here.")
      .addButton((btn) =>
        btn.setButtonText("Reset defaults").onClick(async () => {
          this.plugin.settings = { ...this.plugin.settings };
          await this.plugin.saveSettings();
        })
      );
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: Error — `main.ts` does not exist yet, so `import type DailyPlanPlugin from "./main"` fails. This is expected and will resolve in Task 7.

---

### Task 5: Table Renderer

**Files:**
- Create: `table-renderer.ts`

**Interfaces:**
- Consumes: `Task` from `types.ts`; `computeDuration`, `getCurrentTime` from `time-utils.ts`
- Produces:
  - `renderTable(container: HTMLElement, tasks: Task[], onChange: (tasks: Task[]) => void): HTMLElement` — builds the interactive table inside `container` and returns the table element. Clears existing children of `container` first.

- [ ] **Step 1: Write `table-renderer.ts`**

```typescript
import type { Task } from "./types";
import { computeDuration, getCurrentTime } from "./time-utils";

/**
 * Build an interactive daily-plan table inside `container`.
 * Every mutation calls `onChange(tasks)` so the caller can persist.
 * Returns the table element so the caller can track it.
 */
export function renderTable(
  container: HTMLElement,
  tasks: Task[],
  onChange: (tasks: Task[]) => void
): HTMLElement {
  // Clear any previous content
  container.empty();

  const table = container.createEl("table", { cls: "daily-plan-table" });

  // --- Header ---
  const thead = table.createEl("thead");
  const headerRow = thead.createEl("tr");
  for (const label of ["任务", "开始时间", "结束时间", "总用时", "完成", ""]) {
    headerRow.createEl("th", { text: label });
  }

  // --- Body ---
  const tbody = table.createEl("tbody");

  function buildRow(task: Task, index: number): HTMLTableRowElement {
    const row = tbody.createEl("tr", {
      attr: { "data-index": String(index) },
    });

    // 1. Task name — contenteditable
    const nameCell = row.createEl("td", { cls: "name-cell" });
    nameCell.setAttr("contenteditable", "true");
    nameCell.setText(task.name);
    nameCell.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        nameCell.blur();
      }
    });
    nameCell.addEventListener("blur", () => {
      const newName = nameCell.getText().trim();
      if (newName !== task.name) {
        task.name = newName;
        onChange(tasks);
      }
    });

    // 2. Start time
    const startCell = row.createEl("td", {
      cls: "time-cell",
      text: task.start || "—",
    });
    startCell.addEventListener("click", () => {
      showTimePickerPopup(startCell, task.start, (val) => {
        task.start = val;
        onChange(tasks);
      });
    });

    // 3. End time
    const endCell = row.createEl("td", {
      cls: "time-cell",
      text: task.end || "—",
    });
    endCell.addEventListener("click", () => {
      showTimePickerPopup(endCell, task.end, (val) => {
        task.end = val;
        onChange(tasks);
      });
    });

    // 4. Duration (computed, read-only)
    const dur = computeDuration(task.start, task.end);
    row.createEl("td", { cls: "duration-cell", text: dur || "—" });

    // 5. Done toggle
    const doneCell = row.createEl("td", { cls: "done-cell" });
    const badge = doneCell.createEl("span", {
      cls: `done-badge ${task.done === "Y" ? "is-done" : "is-undone"}`,
      text: task.done === "Y" ? "✓" : "○",
    });
    badge.addEventListener("click", () => {
      task.done = task.done === "Y" ? "N" : "Y";
      onChange(tasks);
    });

    // 6. Delete button
    const delCell = row.createEl("td", { cls: "action-cell" });
    const delBtn = delCell.createEl("button", {
      cls: "delete-row-btn",
      text: "×",
      attr: { title: "删除此任务" },
    });
    delBtn.addEventListener("click", () => {
      tasks.splice(index, 1);
      onChange(tasks);
    });

    return row;
  }

  // Build initial rows
  tasks.forEach((task, idx) => buildRow(task, idx));

  // --- Footer: add-row button ---
  const tfoot = table.createEl("tfoot");
  const footRow = tfoot.createEl("tr");
  const addCell = footRow.createEl("td", { attr: { colspan: "6" } });
  const addBtn = addCell.createEl("button", {
    cls: "add-row-btn",
    text: "+ 添加任务",
  });
  addBtn.addEventListener("click", () => {
    tasks.push({ name: "", start: "", end: "", done: "N" });
    onChange(tasks);
  });

  return table;
}

// ---------------------------------------------------------------------------
// Time-picker popup
// ---------------------------------------------------------------------------

/**
 * Show a small popup anchored inside `cell` so the user can pick a time.
 * Offers a "fill current time" button and a manual HH:mm input.
 */
function showTimePickerPopup(
  cell: HTMLElement,
  currentValue: string,
  onSelect: (time: string) => void
): void {
  // Remove any existing popup
  closeOpenPicker();

  const popup = cell.createEl("div", { cls: "time-picker-popup" });

  // "Fill current time" button
  const nowBtn = popup.createEl("button", {
    cls: "time-picker-now-btn",
    text: "🕐 填入当前时间",
  });
  nowBtn.addEventListener("click", (e: MouseEvent) => {
    e.stopPropagation();
    onSelect(getCurrentTime());
    popup.remove();
  });

  // Separator
  popup.createEl("div", { cls: "time-picker-separator", text: "或手动输入" });

  // Manual input row
  const inputRow = popup.createEl("div", { cls: "time-picker-input-row" });
  const input = inputRow.createEl("input", {
    type: "text",
    placeholder: "HH:mm",
    value: currentValue,
    cls: "time-picker-input",
  });
  input.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmInput();
    }
    e.stopPropagation();
  });
  input.addEventListener("click", (e: MouseEvent) => e.stopPropagation());

  const confirmBtn = inputRow.createEl("button", {
    cls: "time-picker-confirm-btn",
    text: "确认",
  });
  confirmBtn.addEventListener("click", (e: MouseEvent) => {
    e.stopPropagation();
    confirmInput();
  });

  function confirmInput(): void {
    const val = input.value.trim();
    if (/^\d{2}:\d{2}$/.test(val)) {
      const [h, m] = val.split(":").map(Number);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        onSelect(val);
        popup.remove();
      }
    }
  }

  // Focus the input
  setTimeout(() => input.focus(), 0);

  // Close on outside click
  setTimeout(() => {
    document.addEventListener("click", closeOpenPicker, { once: true });
  }, 0);
}

/** Remove the currently open time-picker popup if any. */
function closeOpenPicker(): void {
  const existing = document.querySelector(".time-picker-popup");
  if (existing) existing.remove();
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: No errors in `table-renderer.ts`, `time-utils.ts`, `types.ts`

---

### Task 6: Code Block Processor

**Files:**
- Create: `processor.ts`

**Interfaces:**
- Consumes: `MarkdownPostProcessorContext` from `obsidian`; `parseDailyPlanYaml`, `serializeDailyPlanYaml`, `updateCodeBlock` from `yaml-utils.ts`; `renderTable` from `table-renderer.ts`; `Task` from `types.ts`; `App`, `Editor` from `obsidian`
- Produces:
  - `createDailyPlanProcessor(app: App): (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => void` — factory that returns a code-block processor function. The returned function parses the YAML `source`, renders the table into `el`, and on table changes serializes back and writes to the editor.

- [ ] **Step 1: Write `processor.ts`**

```typescript
import {
  App,
  MarkdownPostProcessorContext,
  MarkdownRenderChild,
} from "obsidian";
import type { Task } from "./types";
import {
  parseDailyPlanYaml,
  serializeDailyPlanYaml,
  updateCodeBlock,
} from "./yaml-utils";
import { renderTable } from "./table-renderer";

/**
 * Factory that creates a code-block processor for ```daily-plan blocks.
 * The processor parses the YAML, builds the interactive table, and handles
 * write-back on every change.
 */
export function createDailyPlanProcessor(
  app: App
): (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => void {
  return (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
    // Parse tasks from the YAML source
    let tasks: Task[] = parseDailyPlanYaml(source);

    // If parsing returned nothing but source isn't empty, show raw block
    // (graceful fallback for malformed YAML)
    if (tasks.length === 0 && source.trim().length > 0) {
      // Source has content but no valid tasks — still render empty table
      // rather than showing raw YAML (user can fix via the table)
    }

    // Render interactive table
    const table = renderTable(el, tasks, (updatedTasks: Task[]) => {
      tasks = updatedTasks;

      // Get active editor
      const editor = app.workspace.activeEditor?.editor;
      if (!editor) return;

      // Serialize and write back
      const newYaml = serializeDailyPlanYaml(tasks);
      updateCodeBlock(editor, newYaml);
    });

    // Register as a MarkdownRenderChild so Obsidian manages lifecycle
    const child = new MarkdownRenderChild(table);
    ctx.addChild(child);
  };
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: Only `main.ts` import error from `settings.ts` should remain. `processor.ts` itself should compile clean.

---

### Task 7: Main Plugin Entry

**Files:**
- Create: `main.ts`

**Interfaces:**
- Consumes: `Plugin`, `Editor`, `MarkdownView`, `Notice` from `obsidian`; `DailyPlanSettingTab` from `settings.ts`; `createDailyPlanProcessor` from `processor.ts`; `DailyPlanSettings`, `DEFAULT_SETTINGS` from `types.ts`
- Produces: `DailyPlanPlugin` class (default export, extends `Plugin`)

- [ ] **Step 1: Write `main.ts`**

```typescript
import { Editor, MarkdownView, Notice, Plugin } from "obsidian";
import { DailyPlanSettingTab } from "./settings";
import { createDailyPlanProcessor } from "./processor";
import type { DailyPlanSettings } from "./types";
import { DEFAULT_SETTINGS } from "./types";

const DAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export default class DailyPlanPlugin extends Plugin {
  settings: DailyPlanSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    // Register code block processor for ```daily-plan
    const processor = createDailyPlanProcessor(this.app);
    this.registerMarkdownCodeBlockProcessor("daily-plan", processor);

    // Register command: Insert today's daily plan
    this.addCommand({
      id: "insert-daily-plan",
      name: "Insert today's daily plan",
      editorCallback: (editor: Editor, view: MarkdownView) => {
        this.insertOrScrollToDailyPlan(editor);
      },
    });

    // Ribbon icon
    this.addRibbonIcon("calendar-days", "Insert daily plan", () => {
      const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (activeView) {
        this.insertOrScrollToDailyPlan(activeView.editor);
      } else {
        new Notice("请先打开一个 Markdown 文件");
      }
    });

    // Settings tab
    this.addSettingTab(new DailyPlanSettingTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /**
   * If the file already has a ```daily-plan block, scroll to the first one.
   * Otherwise, insert a new template at cursor position.
   */
  private insertOrScrollToDailyPlan(editor: Editor): void {
    const content = editor.getValue();
    const markerIndex = content.indexOf("```daily-plan");

    if (markerIndex !== -1) {
      // Block exists — scroll to it
      const pos = editor.offsetToPos(markerIndex);
      editor.setCursor(pos);
      editor.scrollIntoView({ from: pos, to: pos }, true);
      return;
    }

    // No block — insert template at cursor
    const today = new Date();
    const dateStr = this.formatDate(today);
    const dayName = DAY_NAMES[today.getDay()];
    const heading = `### ${dateStr} ${dayName}`;

    const template = `${heading}\n\n\`\`\`daily-plan\ntasks:\n  - name: ""\n    start: ""\n    end: ""\n    done: N\n\`\`\`\n`;

    const cursor = editor.getCursor();
    editor.replaceRange(template, cursor);

    // Place cursor inside the first task name for immediate editing
    const namePos = editor.offsetToPos(
      editor.posToOffset(cursor) + heading.length + 2 + "```daily-plan\ntasks:\n  - name: ".length
    );
    editor.setCursor(namePos);
  }

  /**
   * Format Date as YYYY-MM-DD.
   */
  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
}
```

- [ ] **Step 2: Verify full compilation**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: Zero errors across all files.

- [ ] **Step 3: Build the plugin**

Run: `npm run build`
Expected: `main.js` produced in project root, no errors.

---

### Task 8: Styles

**Files:**
- Create: `styles.css`

**Interfaces:**
- Consumes: CSS classes used in `table-renderer.ts`:
  - `.daily-plan-table`, `.name-cell`, `.time-cell`, `.duration-cell`, `.done-cell`, `.action-cell`
  - `.done-badge`, `.is-done`, `.is-undone`
  - `.delete-row-btn`, `.add-row-btn`
  - `.time-picker-popup`, `.time-picker-now-btn`, `.time-picker-separator`, `.time-picker-input-row`, `.time-picker-input`, `.time-picker-confirm-btn`
- Produces: Complete stylesheet for the interactive table and popup.

- [ ] **Step 1: Write `styles.css`**

```css
/* ── Daily Plan Table ── */
.daily-plan-table {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 14px;
}

.daily-plan-table th {
  text-align: left;
  padding: 6px 8px;
  border-bottom: 2px solid var(--table-border-color, #ccc);
  font-weight: 600;
  color: var(--text-muted);
  font-size: 12px;
  text-transform: uppercase;
}

.daily-plan-table td {
  padding: 4px 8px;
  border-bottom: 1px solid var(--table-border-color, #e0e0e0);
  vertical-align: middle;
}

/* ── Name cell (editable) ── */
.name-cell {
  min-width: 140px;
  cursor: text;
  border-radius: 3px;
  transition: background 0.15s;
}

.name-cell:hover {
  background: var(--background-modifier-hover);
}

.name-cell:focus {
  background: var(--background-modifier-hover);
  outline: 1px solid var(--interactive-accent);
}

/* ── Time cells ── */
.time-cell {
  cursor: pointer;
  min-width: 70px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  border-radius: 3px;
  position: relative;
  transition: background 0.15s;
}

.time-cell:hover {
  background: var(--background-modifier-hover);
}

/* ── Duration cell ── */
.duration-cell {
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
  min-width: 60px;
}

/* ── Done cell ── */
.done-cell {
  text-align: center;
  min-width: 50px;
}

.done-badge {
  display: inline-block;
  cursor: pointer;
  font-size: 16px;
  padding: 2px 6px;
  border-radius: 12px;
  user-select: none;
  transition: all 0.15s;
}

.done-badge.is-done {
  color: #fff;
  background: var(--color-green, #2ecc71);
}

.done-badge.is-undone {
  color: var(--text-muted);
  background: var(--background-modifier-hover);
}

.done-badge:hover {
  transform: scale(1.1);
}

/* ── Action buttons ── */
.action-cell {
  text-align: center;
  min-width: 30px;
}

.delete-row-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: var(--text-muted);
  padding: 0 4px;
  border-radius: 3px;
  line-height: 1;
  transition: all 0.15s;
}

.delete-row-btn:hover {
  color: var(--text-error, #e74c3c);
  background: var(--background-modifier-hover);
}

/* ── Add row button ── */
.add-row-btn {
  width: 100%;
  background: none;
  border: 1px dashed var(--table-border-color, #ccc);
  cursor: pointer;
  padding: 6px;
  font-size: 13px;
  color: var(--text-muted);
  border-radius: 4px;
  transition: all 0.15s;
}

.add-row-btn:hover {
  border-color: var(--interactive-accent);
  color: var(--interactive-accent);
  background: var(--background-modifier-hover);
}

/* ── Time Picker Popup ── */
.time-picker-popup {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1000;
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 6px;
  padding: 8px;
  min-width: 180px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.time-picker-now-btn {
  width: 100%;
  padding: 6px 12px;
  margin-bottom: 6px;
  background: var(--interactive-accent);
  color: var(--text-on-accent);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: opacity 0.15s;
}

.time-picker-now-btn:hover {
  opacity: 0.85;
}

.time-picker-separator {
  font-size: 11px;
  color: var(--text-faint);
  margin-bottom: 4px;
}

.time-picker-input-row {
  display: flex;
  gap: 4px;
}

.time-picker-input {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  background: var(--background-primary);
  color: var(--text-normal);
}

.time-picker-input:focus {
  border-color: var(--interactive-accent);
  outline: none;
}

.time-picker-confirm-btn {
  padding: 4px 10px;
  background: var(--interactive-accent);
  color: var(--text-on-accent);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}

.time-picker-confirm-btn:hover {
  opacity: 0.85;
}
```

- [ ] **Step 2: Verify the file exists and is valid**

Run: `wc -l styles.css` (or just confirm the file is present)
Expected: File is non-empty, all CSS classes used in `table-renderer.ts` are covered.

---

### Task 9: Final Build & Verification

**Files:**
- No new files. Verify everything builds and check the plugin structure.

**Interfaces:** N/A (verification task)

- [ ] **Step 1: Type-check all files**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: Zero errors

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: `main.js` created, no errors. Bundle should include `js-yaml` inlined.

- [ ] **Step 3: Verify output files**

Check that all required output files exist:
- `main.js` (bundled plugin code)
- `manifest.json`
- `styles.css`

- [ ] **Step 4: Verify `main.js` contains `js-yaml`**

Run: `head -c 500 main.js`
Expected: Should see bundled code (not just an import statement for js-yaml).

- [ ] **Step 5: Verify file listing**

Run: `ls -la *.js *.json *.css`
Expected: `main.js`, `manifest.json`, `styles.css` all present and non-zero size.

---

