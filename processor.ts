import {
  App,
  MarkdownPostProcessorContext,
  MarkdownRenderChild,
} from "obsidian";
import type { Task, MiscEntry } from "./types";
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
    // Parse data from the YAML source
    const data = parseDailyPlanYaml(source);
    let tasks: Task[] = data.tasks;
    let misc: MiscEntry[] = data.misc;

    // If parsing returned nothing but source isn't empty, show raw block
    // (graceful fallback for malformed YAML)
    if (tasks.length === 0 && source.trim().length > 0) {
      // Source has content but no valid tasks — still render empty table
      // rather than showing raw YAML (user can fix via the table)
    }

    // Capture the line number of this code block so write-backs target
    // the correct block when the file has multiple daily-plan blocks.
    const sectionInfo = ctx.getSectionInfo(el);
    const blockLine = sectionInfo?.lineStart;

    // Render interactive table + misc section
    const table = renderTable(
      el,
      tasks,
      misc,
      (updatedTasks: Task[], updatedMisc: MiscEntry[]) => {
        tasks = updatedTasks;
        misc = updatedMisc;

        // Get active editor
        const editor = app.workspace.activeEditor?.editor;
        if (!editor) return;

        // Serialize and write back
        const newYaml = serializeDailyPlanYaml({ tasks, misc });
        updateCodeBlock(editor, newYaml, blockLine);
      }
    );

    // Register as a MarkdownRenderChild so Obsidian manages lifecycle
    const child = new MarkdownRenderChild(table);
    ctx.addChild(child);
  };
}
