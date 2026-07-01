import { dump, load } from "js-yaml";
import { Editor, EditorPosition } from "obsidian";
import type { DailyPlanData, Task, Session } from "./types";

const BLOCK_MARKER = "```daily-plan";
const BLOCK_END = "```";

/**
 * Parse YAML source from a daily-plan code block.
 * Auto-migrates old {start, end} format to new {sessions} format.
 */
export function parseDailyPlanYaml(source: string): Task[] {
  try {
    const data = load(source) as { tasks?: unknown } | null;
    if (data && Array.isArray(data.tasks)) {
      return (data.tasks as Record<string, unknown>[]).map((t) => {
        let sessions: Session[] = [];

        if (Array.isArray(t.sessions)) {
          // New format: sessions array
          sessions = (t.sessions as Record<string, unknown>[]).map((s) => ({
            start: typeof s.start === "string" ? s.start : "",
            end: typeof s.end === "string" ? s.end : "",
            note: typeof s.note === "string" ? s.note : "",
          }));
        } else if (typeof t.start === "string" || typeof t.end === "string") {
          // Old format: migrate single start/end to sessions
          sessions = [
            {
              start: typeof t.start === "string" ? t.start : "",
              end: typeof t.end === "string" ? t.end : "",
              note: "",
            },
          ];
        }

        // Ensure at least one empty session
        if (sessions.length === 0) {
          sessions = [{ start: "", end: "", note: "" }];
        }

        let done: "Y" | "N" | "";
        if (t.done === "Y") done = "Y";
        else if (t.done === "N") done = "N";
        else done = "";

        return { name: typeof t.name === "string" ? t.name : "", sessions, done };
      });
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
  let result = yaml.trimEnd() + "\n";
  // Unquote Y/N values on the done field for cleaner output
  result = result.replace(/done: "([YN])"/g, "done: $1");
  return result;
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

  const contentStart = content.indexOf("\n", startIdx);
  if (contentStart === -1) return null;

  const endIdx = content.indexOf("\n" + BLOCK_END, contentStart);
  if (endIdx === -1) return null;

  return {
    start: editor.offsetToPos(contentStart + 1),
    end: editor.offsetToPos(endIdx + 1),
  };
}

/**
 * Replace the content inside the first ```daily-plan code block
 * with the given YAML string, then scroll the block back into view.
 */
export function updateCodeBlock(editor: Editor, newYaml: string): void {
  const range = findCodeBlockRange(editor);
  if (!range) return;

  editor.replaceRange(newYaml, range.start, range.end);

  // Re-find and scroll to prevent view jump
  const newRange = findCodeBlockRange(editor);
  if (newRange) {
    editor.scrollIntoView(
      { from: newRange.start, to: newRange.start },
      true
    );
  }
}
