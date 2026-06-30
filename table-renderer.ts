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
