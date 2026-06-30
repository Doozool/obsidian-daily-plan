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
