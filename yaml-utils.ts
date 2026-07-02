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
 * Find the range (start and end positions) of a ```daily-plan
 * code block in the editor. When `nearLine` is provided, finds
 * the block that contains that line; otherwise returns the first block.
 * Returns null if no block is found.
 */
export function findCodeBlockRange(
  editor: Editor,
  nearLine?: number
): { start: EditorPosition; end: EditorPosition } | null {
  const lines = editor.getValue().split("\n");

  // Build a list of all daily-plan block ranges
  const blocks: { contentStart: number; contentEnd: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(BLOCK_MARKER)) {
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j] === BLOCK_END) {
          // contentStart = first char of line after marker
          // contentEnd   = beginning of closing ``` line
          blocks.push({ contentStart: i + 1, contentEnd: j });
          i = j;
          break;
        }
      }
    }
  }

  if (blocks.length === 0) return null;

  // If nearLine is given, pick the block that contains it
  let block = blocks[0];
  if (nearLine !== undefined) {
    for (const b of blocks) {
      if (nearLine >= b.contentStart && nearLine <= b.contentEnd) {
        block = b;
        break;
      }
    }
    // Fallback: if no block contains nearLine, use the last block
    // (user is likely editing below existing blocks)
    if (nearLine < blocks[0].contentStart) {
      block = blocks[0];
    } else if (nearLine > blocks[blocks.length - 1].contentEnd) {
      block = blocks[blocks.length - 1];
    }
  }

  return {
    start: { line: block.contentStart, ch: 0 },
    end: { line: block.contentEnd, ch: 0 },
  };
}

/**
 * Replace the content inside a ```daily-plan code block with the given
 * YAML string. Uses `nearLine` to target the correct block when the file
 * contains multiple daily-plan blocks.
 */
export function updateCodeBlock(
  editor: Editor,
  newYaml: string,
  nearLine?: number
): void {
  // Save scroll position before mutation
  const scrollY = window.scrollY;

  const range = findCodeBlockRange(editor, nearLine);
  if (!range) return;

  editor.replaceRange(newYaml, range.start, range.end);

  // Restore scroll position (avoid jump caused by content height change)
  window.scrollTo(0, scrollY);
}
