const DATE_OPTS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
}

const DATETIME_OPTS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
}

/** Parse a date string safely. Date-only strings (YYYY-MM-DD) are treated as
 *  local midnight to avoid UTC-offset date shifts. */
function parseDate(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00`)
    : new Date(value)
}

/** Format a date-only value (string or Date). */
export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? parseDate(value) : value
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(undefined, DATE_OPTS)
}

/** Format a datetime value. Accepts either:
 *  - An ISO / full datetime string or Date object
 *  - A date string + separate time string (e.g. from form inputs) */
export function formatDateTime(value: string | Date, time?: string): string {
  let d: Date
  if (typeof value === "string" && time) {
    d = new Date(`${value}T${time}`)
  } else {
    d = typeof value === "string" ? parseDate(value) : value
  }
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleString(undefined, DATETIME_OPTS)
}
