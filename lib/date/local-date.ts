/**
 * Convert a Date to local YYYY-MM-DD.
 * Avoids UTC date shifts from toISOString().
 */
export function toLocalDateString(date = new Date()): string {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}
