import { dump, load } from "js-yaml";
import { Editor, EditorPosition } from "obsidian";
import type { DailyPlanData, Task, Session, MiscEntry } from "./types";

const BLOCK_MARKER = "```daily-plan";
const BLOCK_END = "```";

/**
 * Parse YAML source from a daily-plan code block.
 * Auto-migrates old {start, end} format to new {sessions} format.
 */
export function parseDailyPlanYaml(source: string): DailyPlanData {
  try {
    const data = load(source) as { tasks?: unknown; misc?: unknown } | null;

    const tasks: Task[] = [];
    if (data && Array.isArray(data.tasks)) {
      for (const t of data.tasks as Record<string, unknown>[]) {
        let sessions: Session[] = [];

        if (Array.isArray(t.sessions)) {
          sessions = (t.sessions as Record<string, unknown>[]).map((s) => ({
            start: typeof s.start === "string" ? s.start : "",
            end: typeof s.end === "string" ? s.end : "",
            note: typeof s.note === "string" ? s.note : "",
          }));
        } else if (typeof t.start === "string" || typeof t.end === "string") {
          sessions = [
            {
              start: typeof t.start === "string" ? t.start : "",
              end: typeof t.end === "string" ? t.end : "",
              note: "",
            },
          ];
        }

        if (sessions.length === 0) {
          sessions = [{ start: "", end: "", note: "" }];
        }

        let done: "Y" | "N" | "";
        if (t.done === "Y") done = "Y";
        else if (t.done === "N") done = "N";
        else done = "";

        tasks.push({ name: typeof t.name === "string" ? t.name : "", sessions, done });
      }
    }

    const misc: MiscEntry[] = [];
    if (data && Array.isArray(data.misc)) {
      for (const m of data.misc as Record<string, unknown>[]) {
        const done = typeof m.done === "boolean" ? m.done : m.done === "Y";
        misc.push({
          text: typeof m.text === "string" ? m.text : "",
          done,
        });
      }
    }

    return { tasks, misc };
  } catch {
    return { tasks: [], misc: [] };
  }
}

/**
 * Serialize tasks and misc to a YAML string.
 * The `misc` key is omitted when the misc list is empty.
 */
export function serializeDailyPlanYaml(data: DailyPlanData): string {
  const dumpData: Record<string, unknown> = { tasks: data.tasks };
  if (data.misc.length > 0) {
    dumpData.misc = data.misc;
  }
  const yaml = dump(dumpData, {
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
  // contentStart = line of opening marker (to match sectionInfo.lineStart)
  // contentEnd   = line of closing ```
  const blocks: { contentStart: number; contentEnd: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(BLOCK_MARKER)) {
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j] === BLOCK_END) {
          blocks.push({ contentStart: i, contentEnd: j });
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

  // contentStart is the marker line; replacement starts on the next line
  return {
    start: { line: block.contentStart + 1, ch: 0 },
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
  const range = findCodeBlockRange(editor, nearLine);
  if (!range) return;

  editor.replaceRange(newYaml, range.start, range.end);
}
