import type { Session, Task } from "./types";

/**
 * Returns the current time formatted as HH:mm (24-hour).
 */
export function getCurrentTime(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Parses a HH:mm string into total minutes since midnight.
 * Returns NaN if the format is invalid.
 */
function parseMinutes(time: string): number {
  if (!/^\d{2}:\d{2}$/.test(time)) return NaN;
  const [h, m] = time.split(":").map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return NaN;
  return h * 60 + m;
}

/**
 * Computes the duration between two HH:mm times.
 * Returns a human-readable string like "1h 30m", or null
 * if either input is empty or invalid.
 */
export function computeDuration(start: string, end: string): string | null {
  if (!start || !end) return null;

  const startMin = parseMinutes(start);
  const endMin = parseMinutes(end);

  if (isNaN(startMin) || isNaN(endMin)) return null;
  if (endMin <= startMin) return null;

  const diff = endMin - startMin;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

/**
 * Sum durations across all sessions of a task.
 * Returns total minutes, or 0 if no valid durations.
 */
export function computeTaskMinutes(task: Task): number {
  let total = 0;
  for (const s of task.sessions) {
    if (!s.start || !s.end) continue;
    const startMin = parseMinutes(s.start);
    const endMin = parseMinutes(s.end);
    if (isNaN(startMin) || isNaN(endMin) || endMin <= startMin) continue;
    total += endMin - startMin;
  }
  return total;
}

/**
 * Format total minutes as a human-readable string.
 * Returns null if minutes is 0.
 */
export function formatDuration(minutes: number): string | null {
  if (minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

/**
 * Sum durations across ALL tasks. Returns human-readable total or null.
 */
export function computeTotalDuration(tasks: Task[]): string | null {
  let totalMinutes = 0;
  for (const t of tasks) {
    totalMinutes += computeTaskMinutes(t);
  }
  return formatDuration(totalMinutes);
}

/**
 * Check if a task has any valid duration (for done-state toggle logic).
 */
export function hasAnyDuration(task: Task): boolean {
  return computeTaskMinutes(task) > 0;
}

/**
 * Check if any session has a valid duration (for done-state per-task).
 */
export function hasSessionDuration(session: Session): boolean {
  return computeDuration(session.start, session.end) !== null;
}
