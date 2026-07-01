import { Editor, MarkdownFileInfo, MarkdownView, Notice, Plugin } from "obsidian";
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
      editorCallback: (editor: Editor, view: MarkdownView | MarkdownFileInfo) => {
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

    const template = `${heading}\n\n\`\`\`daily-plan\ntasks:\n  - name: ""\n    sessions:\n      - start: ""\n        end: ""\n    done: ""\n\`\`\`\n`;

    const cursor = editor.getCursor();
    editor.replaceRange(template, cursor);

    // Place cursor after the code block so it renders as a table immediately
    const endPos = editor.offsetToPos(editor.posToOffset(cursor) + template.length);
    editor.setCursor(endPos);
  }

  /**
   * Format Date as YYYY-MM-DD.
   */
  private formatDate(d: Date): string {
    const m = d.getMonth() + 1;
    const day = String(d.getDate()).padStart(2, "0");
    return `${m}.${day}`;
  }
}
