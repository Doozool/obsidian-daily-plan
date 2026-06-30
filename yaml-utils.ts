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
    const data = load(source) as { tasks?: unknown } | null;
    if (data && Array.isArray(data.tasks)) {
      return (data.tasks as Record<string, unknown>[]).map((t) => ({
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
