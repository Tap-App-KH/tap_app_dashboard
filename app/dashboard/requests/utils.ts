export type Tab = "all" | "accepted" | "paid" | "cancelled"

export function tabFilter(tab: Tab): string {
  if (tab === "accepted") return "&filters[accepted][$eq]=true"
  if (tab === "cancelled") return "&filters[cancelled][$eq]=true"
  if (tab === "paid") return "&filters[paid][$eq]=true"
  return ""
}

export function dateFilter(
  from: Date | undefined,
  to: Date | undefined
): string {
  let qs = ""
  if (from) {
    const y = from.getFullYear()
    const m = String(from.getMonth() + 1).padStart(2, "0")
    const d = String(from.getDate()).padStart(2, "0")
    qs += `&filters[date][$gte]=${y}-${m}-${d}`
  }
  if (to) {
    const y = to.getFullYear()
    const m = String(to.getMonth() + 1).padStart(2, "0")
    const d = String(to.getDate()).padStart(2, "0")
    qs += `&filters[date][$lte]=${y}-${m}-${d}`
  }
  return qs
}

/** Build the date query string for the period immediately before [from, to]. */
export function prevDateFilter(
  from: Date | undefined,
  to: Date | undefined
): string {
  if (!from || !to) return ""
  const msPerDay = 86_400_000
  const days = Math.round((to.getTime() - from.getTime()) / msPerDay) + 1
  const prevTo = new Date(from.getTime() - msPerDay)
  const prevFrom = new Date(prevTo.getTime() - (days - 1) * msPerDay)
  return dateFilter(prevFrom, prevTo)
}

/** Returns { pct, direction } for a KPI trend badge. */
export function calcTrend(
  current: number,
  prev: number | undefined
): { pct: number | null; direction: "up" | "down" | "flat" | "new" | "none" } {
  if (prev === undefined) return { pct: null, direction: "none" }
  if (prev === 0 && current === 0) return { pct: 0, direction: "flat" }
  if (prev === 0) return { pct: null, direction: "new" }
  const pct = Math.round(((current - prev) / prev) * 100)
  return { pct, direction: pct > 0 ? "up" : pct < 0 ? "down" : "flat" }
}
