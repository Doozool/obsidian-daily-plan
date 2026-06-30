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
