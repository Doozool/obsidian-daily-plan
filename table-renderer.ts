import type { Task, Session, MiscEntry } from "./types";
import {
  computeDuration,
  computeTaskMinutes,
  computeTotalDuration,
  formatDuration,
  getCurrentTime,
  hasAnyDuration,
} from "./time-utils";

/**
 * Build an interactive daily-plan table inside `container`,
 * followed by the misc section. Every mutation calls `onChange(tasks, misc)`
 * so the caller can persist.
 */
export function renderTable(
  container: HTMLElement,
  tasks: Task[],
  misc: MiscEntry[],
  onChange: (tasks: Task[], misc: MiscEntry[]) => void
): HTMLElement {
  container.empty();

  const table = container.createEl("table", { cls: "daily-plan-table" });

  table.addEventListener("mousedown", (e: MouseEvent) => {
    e.stopPropagation();
  });
  table.addEventListener("keydown", (e: KeyboardEvent) => {
    e.stopPropagation();
  });

  // --- Header ---
  const thead = table.createEl("thead");
  const headerRow = thead.createEl("tr");
  for (const label of ["任务", "开始", "结束", "用时", "完成", ""]) {
    headerRow.createEl("th", { text: label });
  }

  // --- Body ---
  const tbody = table.createEl("tbody");

  function buildTaskRows(task: Task, taskIdx: number): void {
    const sessionCount = task.sessions.length;

    task.sessions.forEach((session, sessIdx) => {
      const isLast = sessIdx === sessionCount - 1;
      const row = tbody.createEl("tr", {
        attr: { "data-task": String(taskIdx), "data-session": String(sessIdx) },
      });

      // ── 1. Name cell (rowspan across sessions) ──
      if (sessIdx === 0) {
        const nameCell = row.createEl("td", {
          cls: "name-cell",
          attr: { rowspan: String(sessionCount) },
        });
        nameCell.setAttr("contenteditable", "true");
        nameCell.setText(task.name);

        nameCell.addEventListener(
          "keydown",
          (e: KeyboardEvent) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              nameCell.blur();
            }
          },
          true
        );

        nameCell.addEventListener("blur", () => {
          const newName = nameCell.getText().trim();
          if (newName !== task.name) {
            task.name = newName;
            onChange(tasks, misc);
          }
        });
      }

      // ── 2. Start time ──
      const startCell = row.createEl("td", {
        cls: "time-cell",
        text: session.start || "—",
      });
      startCell.addEventListener("click", (e: MouseEvent) => {
        e.stopPropagation();
        showTimePickerPopup(startCell, session.start, (val) => {
          session.start = val;
          onChange(tasks, misc);
        });
      });

      // ── 3. End time ──
      const endCell = row.createEl("td", {
        cls: "time-cell",
        text: session.end || "—",
      });
      endCell.addEventListener("click", (e: MouseEvent) => {
        e.stopPropagation();
        showTimePickerPopup(endCell, session.end, (val) => {
          session.end = val;
          onChange(tasks, misc);
        });
      });

      // ── 4. Duration + note ──
      const dur = computeDuration(session.start, session.end);
      const durCell = row.createEl("td", { cls: "duration-cell" });

      if (dur) {
        durCell.createEl("span", { cls: "dur-text", text: dur });
      } else if (isLast && sessionCount > 1) {
        const taskMin = computeTaskMinutes(task);
        if (taskMin > 0) {
          durCell.createEl("span", { cls: "dur-text", text: `计 ${formatDuration(taskMin)}` });
        } else {
          durCell.createEl("span", { cls: "dur-text", text: "—" });
        }
      } else {
        durCell.createEl("span", { cls: "dur-text", text: "—" });
      }

      // Multi-session: show task total on last row
      if (isLast && sessionCount > 1) {
        const taskMin = computeTaskMinutes(task);
        if (taskMin > 0 && dur) {
          durCell.createEl("span", {
            cls: "dur-sub",
            text: `计 ${formatDuration(taskMin)}`,
          });
        }
      }

      // Note — only show when task has multiple sessions
      if (sessionCount > 1) {
        const noteSpan = durCell.createEl("span", {
          cls: "session-note",
          text: session.note || "",
          attr: { "data-placeholder": "备注…" },
        });
        noteSpan.setAttr("contenteditable", "true");
        noteSpan.addEventListener(
          "keydown",
          (e: KeyboardEvent) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              noteSpan.blur();
            }
          },
          true
        );
        noteSpan.addEventListener("blur", () => {
          const newNote = noteSpan.getText().trim();
          if (newNote !== session.note) {
            session.note = newNote;
            onChange(tasks, misc);
          }
        });
      }

      // ── 5. Done badge (rowspan across sessions) ──
      if (sessIdx === 0) {
        const doneCell = row.createEl("td", {
          cls: "done-cell",
          attr: { rowspan: String(sessionCount) },
        });
        const hasDuration = hasAnyDuration(task);

        if (!hasDuration) {
          const badge = doneCell.createEl("span", {
            cls: "done-badge is-idle",
          });
        } else {
          const isDone = task.done === "Y";
          const badge = doneCell.createEl("span", {
            cls: `done-badge ${isDone ? "is-done" : "is-undone"}`,
            text: isDone ? "✓" : "✕",
          });
          badge.addEventListener("click", (e: MouseEvent) => {
            e.stopPropagation();
            task.done = task.done === "Y" ? "N" : "Y";
            onChange(tasks, misc);
          });
        }
      }

      // ── 6. Action buttons (× delete, + add on last row) ──
      const actCell = row.createEl("td", { cls: "action-cell" });

      // Delete session button
      const delBtn = actCell.createEl("button", {
        cls: "delete-session-btn",
        text: "×",
        attr: { title: "删除此时段" },
      });
      delBtn.addEventListener("click", (e: MouseEvent) => {
        e.stopPropagation();
        if (task.sessions.length <= 1) {
          tasks.splice(taskIdx, 1);
        } else {
          task.sessions.splice(sessIdx, 1);
        }
        onChange(tasks, misc);
      });

      // Add-session button (only on last row)
      if (isLast) {
        const addBtn = actCell.createEl("button", {
          cls: "add-session-btn",
          text: "+",
          attr: { title: "添加时段" },
        });
        addBtn.addEventListener("click", (e: MouseEvent) => {
          e.stopPropagation();
          task.sessions.push({ start: "", end: "", note: "" });
          onChange(tasks, misc);
        });
      }
    });
  }

  // Build all task rows
  tasks.forEach((task, idx) => buildTaskRows(task, idx));

  // --- Footer: total + add task ---
  const tfoot = table.createEl("tfoot");

  // Total row
  const totalRow = tfoot.createEl("tr", { cls: "total-row" });
  totalRow.createEl("td", {
    attr: { colspan: "3" },
    cls: "total-label",
    text: "总计",
  });
  totalRow.createEl("td", {
    cls: "total-duration",
    text: computeTotalDuration(tasks) || "—",
  });
  totalRow.createEl("td");
  totalRow.createEl("td");

  // Add-task row
  const addRow = tfoot.createEl("tr");
  const addCell = addRow.createEl("td", { attr: { colspan: "6" } });
  const addBtn = addCell.createEl("button", {
    cls: "add-row-btn",
    text: "+ 添加任务",
  });
  addBtn.addEventListener("click", (e: MouseEvent) => {
    e.stopPropagation();
    tasks.push({
      name: "",
      sessions: [{ start: "", end: "", note: "" }],
      done: "",
    });
    onChange(tasks, misc);
  });

  // ---------------------------------------------------------------------------
  // Misc section — render below the table
  // ---------------------------------------------------------------------------
  renderMiscSection(container, misc, (updatedMisc: MiscEntry[]) => {
    onChange(tasks, updatedMisc);
  });

  return table;
}

/**
 * Render the "杂项" section (misc items) below the main table.
 * Only renders when misc is non-empty; otherwise clears any existing section.
 */
function renderMiscSection(
  container: HTMLElement,
  misc: MiscEntry[],
  onChange: (misc: MiscEntry[]) => void
): void {
  // Build misc section container
  const section = container.createEl("div", { cls: "daily-plan-misc" });

  const heading = section.createEl("h4", {
    cls: "misc-heading",
    text: "杂项",
  });

  const list = section.createEl("div", { cls: "misc-list" });

  function buildMiscItems(): void {
    list.empty();

    misc.forEach((item, idx) => {
      const row = list.createEl("div", { cls: "misc-item" });

      // Done checkbox
      const checkbox = row.createEl("span", {
        cls: `misc-checkbox ${item.done ? "is-done" : "is-undone"}`,
        text: item.done ? "✓" : "",
      });
      checkbox.addEventListener("click", (e: MouseEvent) => {
        e.stopPropagation();
        item.done = !item.done;
        onChange(misc);
      });

      // Editable text
      const textSpan = row.createEl("span", {
        cls: "misc-text",
        attr: { "data-placeholder": "杂项…" },
      });
      textSpan.setAttr("contenteditable", "true");
      textSpan.setText(item.text);
      textSpan.addEventListener(
        "keydown",
        (e: KeyboardEvent) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            textSpan.blur();
          }
        },
        true
      );
      textSpan.addEventListener("blur", () => {
        const newText = textSpan.getText().trim();
        if (newText !== item.text) {
          item.text = newText;
          onChange(misc);
        }
      });

      // Delete button
      const delBtn = row.createEl("button", {
        cls: "misc-delete-btn",
        text: "×",
        attr: { title: "删除此杂项" },
      });
      delBtn.addEventListener("click", (e: MouseEvent) => {
        e.stopPropagation();
        misc.splice(idx, 1);
        onChange(misc);
      });
    });
  }

  buildMiscItems();

  // Add misc item button
  const addBtn = section.createEl("button", {
    cls: "add-misc-btn",
    text: "+ 添加杂项",
  });
  addBtn.addEventListener("click", (e: MouseEvent) => {
    e.stopPropagation();
    misc.push({ text: "", done: false });
    onChange(misc);
  });
}

// ---------------------------------------------------------------------------
// Time-picker popup
// ---------------------------------------------------------------------------

function showTimePickerPopup(
  cell: HTMLElement,
  currentValue: string,
  onSelect: (time: string) => void
): void {
  closeOpenPicker();

  const popup = document.body.createEl("div", { cls: "time-picker-popup" });

  const rect = cell.getBoundingClientRect();
  popup.style.position = "fixed";
  popup.style.top = rect.bottom + 4 + "px";
  popup.style.left = rect.left + "px";
  popup.style.zIndex = "1000";

  const nowBtn = popup.createEl("button", {
    cls: "time-picker-now-btn",
    text: "填入当前时间",
  });
  nowBtn.addEventListener("click", (e: MouseEvent) => {
    e.stopPropagation();
    onSelect(getCurrentTime());
    popup.remove();
  });

  popup.createEl("div", { cls: "time-picker-separator", text: "或手动输入" });

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

  setTimeout(() => input.focus(), 0);

  setTimeout(() => {
    document.addEventListener("click", closeOpenPicker, { once: true });
  }, 0);
}

function closeOpenPicker(): void {
  const existing = document.querySelector(".time-picker-popup");
  if (existing) existing.remove();
}
