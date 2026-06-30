import type { Task } from "./types";
import { computeDuration, computeTotalDuration, getCurrentTime } from "./time-utils";

/**
 * Build an interactive daily-plan table inside `container`.
 * Every mutation calls `onChange(tasks)` so the caller can persist.
 */
export function renderTable(
  container: HTMLElement,
  tasks: Task[],
  onChange: (tasks: Task[]) => void
): HTMLElement {
  // Clear any previous content
  container.empty();

  const table = container.createEl("table", { cls: "daily-plan-table" });

  // Prevent Obsidian from intercepting clicks/keys inside our table
  table.addEventListener("mousedown", (e: MouseEvent) => {
    e.stopPropagation();
  });
  table.addEventListener("keydown", (e: KeyboardEvent) => {
    e.stopPropagation();
  });

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

    // 1. Task name — contenteditable, Enter=blur, no newlines
    const nameCell = row.createEl("td", { cls: "name-cell" });
    nameCell.setAttr("contenteditable", "true");
    nameCell.setText(task.name);

    // Capture phase to beat Obsidian's own key handlers
    nameCell.addEventListener(
      "keydown",
      (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          nameCell.blur();
        }
      },
      true // capture phase
    );

    nameCell.addEventListener("blur", () => {
      const newName = nameCell.getText().trim();
      if (newName !== task.name) {
        task.name = newName;
        onChange(tasks);
      }
    });

    // 2. Start time — click opens popup
    const startCell = row.createEl("td", {
      cls: "time-cell",
      text: task.start || "—",
    });
    startCell.addEventListener("click", (e: MouseEvent) => {
      e.stopPropagation();
      showTimePickerPopup(startCell, task.start, (val) => {
        task.start = val;
        onChange(tasks);
      });
    });

    // 3. End time — click opens popup
    const endCell = row.createEl("td", {
      cls: "time-cell",
      text: task.end || "—",
    });
    endCell.addEventListener("click", (e: MouseEvent) => {
      e.stopPropagation();
      showTimePickerPopup(endCell, task.end, (val) => {
        task.end = val;
        onChange(tasks);
      });
    });

    // 4. Duration (computed, read-only)
    const dur = computeDuration(task.start, task.end);
    row.createEl("td", { cls: "duration-cell", text: dur || "—" });

    // 5. Done toggle — logic depends on whether duration exists
    const doneCell = row.createEl("td", { cls: "done-cell" });
    const hasDuration = dur !== null;

    if (!hasDuration) {
      // No times filled → dashed empty circle, non-interactive
      const badge = doneCell.createEl("span", {
        cls: "done-badge is-idle",
      });
    } else {
      // Has duration → toggle between ✓ and ✕
      const isDone = task.done === "Y";
      const badge = doneCell.createEl("span", {
        cls: `done-badge ${isDone ? "is-done" : "is-undone"}`,
        text: isDone ? "✓" : "✕",
      });
      badge.addEventListener("click", (e: MouseEvent) => {
        e.stopPropagation();
        task.done = task.done === "Y" ? "N" : "Y";
        onChange(tasks);
      });
    }

    // 6. Delete button
    const delCell = row.createEl("td", { cls: "action-cell" });
    const delBtn = delCell.createEl("button", {
      cls: "delete-row-btn",
      text: "×",
      attr: { title: "删除此任务" },
    });
    delBtn.addEventListener("click", (e: MouseEvent) => {
      e.stopPropagation();
      tasks.splice(index, 1);
      onChange(tasks);
    });

    return row;
  }

  // Build initial rows
  tasks.forEach((task, idx) => buildRow(task, idx));

  // --- Footer: total duration + add-row button ---
  const tfoot = table.createEl("tfoot");

  // Total row
  const totalRow = tfoot.createEl("tr", { cls: "total-row" });
  totalRow.createEl("td", { attr: { colspan: "3" }, cls: "total-label", text: "总计" });
  totalRow.createEl("td", { cls: "total-duration", text: computeTotalDuration(tasks) || "—" });
  // Empty cells for done + action columns
  totalRow.createEl("td");
  totalRow.createEl("td");

  // Add-row button row
  const addRow = tfoot.createEl("tr");
  const addCell = addRow.createEl("td", { attr: { colspan: "6" } });
  const addBtn = addCell.createEl("button", {
    cls: "add-row-btn",
    text: "+ 添加任务",
  });
  addBtn.addEventListener("click", (e: MouseEvent) => {
    e.stopPropagation();
    tasks.push({ name: "", start: "", end: "", done: "" });
    onChange(tasks);
  });

  return table;
}

// ---------------------------------------------------------------------------
// Time-picker popup (attached to document.body to avoid clipping)
// ---------------------------------------------------------------------------

function showTimePickerPopup(
  cell: HTMLElement,
  currentValue: string,
  onSelect: (time: string) => void
): void {
  closeOpenPicker();

  const popup = document.body.createEl("div", { cls: "time-picker-popup" });

  // Position the popup near the cell
  const rect = cell.getBoundingClientRect();
  popup.style.position = "fixed";
  popup.style.top = rect.bottom + 4 + "px";
  popup.style.left = rect.left + "px";
  popup.style.zIndex = "1000";

  // "Fill current time" button
  const nowBtn = popup.createEl("button", {
    cls: "time-picker-now-btn",
    text: "填入当前时间",
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

function closeOpenPicker(): void {
  const existing = document.querySelector(".time-picker-popup");
  if (existing) existing.remove();
}
