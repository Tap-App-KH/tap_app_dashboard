import { describe, it, expect } from "vitest"
import {
  tabFilter,
  dateFilter,
  prevDateFilter,
  calcTrend,
  type Tab,
} from "./utils"

// ─── tabFilter ────────────────────────────────────────────────────────────────

describe("tabFilter", () => {
  it('returns empty string for "all" tab', () => {
    expect(tabFilter("all")).toBe("")
  })

  it('returns accepted filter for "accepted" tab', () => {
    expect(tabFilter("accepted")).toBe("&filters[accepted][$eq]=true")
  })

  it('returns paid filter for "paid" tab', () => {
    expect(tabFilter("paid")).toBe("&filters[paid][$eq]=true")
  })

  it('returns cancelled filter for "cancelled" tab', () => {
    expect(tabFilter("cancelled")).toBe("&filters[cancelled][$eq]=true")
  })

  it("each tab produces a unique query string", () => {
    const tabs: Tab[] = ["all", "accepted", "paid", "cancelled"]
    const results = tabs.map(tabFilter)
    const unique = new Set(results)
    expect(unique.size).toBe(tabs.length)
  })
})

// ─── dateFilter ───────────────────────────────────────────────────────────────

describe("dateFilter", () => {
  it("returns empty string when both from and to are undefined", () => {
    expect(dateFilter(undefined, undefined)).toBe("")
  })

  it("returns only gte filter when only from is provided", () => {
    const from = new Date(2024, 0, 15) // Jan 15 2024
    expect(dateFilter(from, undefined)).toBe("&filters[date][$gte]=2024-01-15")
  })

  it("returns only lte filter when only to is provided", () => {
    const to = new Date(2024, 11, 31) // Dec 31 2024
    expect(dateFilter(undefined, to)).toBe("&filters[date][$lte]=2024-12-31")
  })

  it("returns both gte and lte filters when both dates are provided", () => {
    const from = new Date(2024, 2, 1) // Mar 1 2024
    const to = new Date(2024, 2, 31) // Mar 31 2024
    expect(dateFilter(from, to)).toBe(
      "&filters[date][$gte]=2024-03-01&filters[date][$lte]=2024-03-31"
    )
  })

  it("zero-pads single-digit months", () => {
    const from = new Date(2024, 0, 1) // Jan = month 0 → "01"
    const to = new Date(2024, 8, 5) // Sep = month 8 → "09"
    const result = dateFilter(from, to)
    expect(result).toContain("2024-01-01")
    expect(result).toContain("2024-09-05")
  })

  it("zero-pads single-digit days", () => {
    const from = new Date(2024, 3, 5) // Apr 5
    const to = new Date(2024, 3, 9) // Apr 9
    const result = dateFilter(from, to)
    expect(result).toContain("2024-04-05")
    expect(result).toContain("2024-04-09")
  })

  it("formats dates as YYYY-MM-DD (no time component leaked)", () => {
    const from = new Date(2024, 5, 1, 23, 59, 59) // Jun 1 2024 23:59:59
    const result = dateFilter(from, undefined)
    expect(result).toBe("&filters[date][$gte]=2024-06-01")
  })

  it("handles leap year Feb 29 correctly", () => {
    const from = new Date(2024, 1, 29) // Feb 29 2024 (leap year)
    expect(dateFilter(from, undefined)).toBe("&filters[date][$gte]=2024-02-29")
  })

  it("preserves gte before lte in the output string", () => {
    const from = new Date(2024, 0, 1)
    const to = new Date(2024, 11, 31)
    const result = dateFilter(from, to)
    const gteIdx = result.indexOf("[$gte]")
    const lteIdx = result.indexOf("[$lte]")
    expect(gteIdx).toBeLessThan(lteIdx)
  })

  it("handles same date for from and to", () => {
    const date = new Date(2024, 6, 4) // Jul 4 2024
    expect(dateFilter(date, date)).toBe(
      "&filters[date][$gte]=2024-07-04&filters[date][$lte]=2024-07-04"
    )
  })
})

// ─── prevDateFilter ───────────────────────────────────────────────────────────

describe("prevDateFilter", () => {
  it("returns empty string when both dates are undefined", () => {
    expect(prevDateFilter(undefined, undefined)).toBe("")
  })

  it("returns empty string when only from is provided", () => {
    const from = new Date(2024, 0, 15)
    expect(prevDateFilter(from, undefined)).toBe("")
  })

  it("returns empty string when only to is provided", () => {
    const to = new Date(2024, 0, 15)
    expect(prevDateFilter(undefined, to)).toBe("")
  })

  it("returns a non-empty string when both dates are provided", () => {
    const from = new Date(2024, 0, 11)
    const to = new Date(2024, 0, 20)
    expect(prevDateFilter(from, to)).not.toBe("")
  })

  it("calculates the immediately preceding period of the same length (10-day period)", () => {
    // from=Jan 11, to=Jan 20 → 10 days
    // prev period: Jan 1 to Jan 10
    const from = new Date(2024, 0, 11) // Jan 11
    const to = new Date(2024, 0, 20) // Jan 20
    const result = prevDateFilter(from, to)
    expect(result).toBe(
      "&filters[date][$gte]=2024-01-01&filters[date][$lte]=2024-01-10"
    )
  })

  it("calculates the preceding period for a 1-day range (single day)", () => {
    // from=Jan 15, to=Jan 15 → 1 day
    // prev period: Jan 14 to Jan 14
    const from = new Date(2024, 0, 15)
    const to = new Date(2024, 0, 15)
    const result = prevDateFilter(from, to)
    expect(result).toBe(
      "&filters[date][$gte]=2024-01-14&filters[date][$lte]=2024-01-14"
    )
  })

  it("correctly crosses a month boundary", () => {
    // from=Mar 1, to=Mar 31 → 31 days
    // prevTo = Feb 29 (Mar 1 - 1 day), prevFrom = Jan 30 (Feb 29 - 30 days)
    const from = new Date(2024, 2, 1) // Mar 1
    const to = new Date(2024, 2, 31) // Mar 31
    const result = prevDateFilter(from, to)
    expect(result).toBe(
      "&filters[date][$gte]=2024-01-30&filters[date][$lte]=2024-02-29"
    )
  })

  it("correctly crosses a year boundary", () => {
    // from=Jan 1 2024, to=Jan 31 2024 → 31 days
    // prev period: Dec 1 2023 to Dec 31 2023
    const from = new Date(2024, 0, 1)
    const to = new Date(2024, 0, 31)
    const result = prevDateFilter(from, to)
    expect(result).toBe(
      "&filters[date][$gte]=2023-12-01&filters[date][$lte]=2023-12-31"
    )
  })

  it("prev period ends the day before the from date", () => {
    const from = new Date(2024, 3, 10) // Apr 10
    const to = new Date(2024, 3, 20) // Apr 20
    const result = prevDateFilter(from, to)
    // prevTo = Apr 9
    expect(result).toContain("2024-04-09")
  })
})

// ─── calcTrend ────────────────────────────────────────────────────────────────

describe("calcTrend", () => {
  it('returns direction "none" and pct null when prev is undefined', () => {
    expect(calcTrend(10, undefined)).toEqual({ pct: null, direction: "none" })
    expect(calcTrend(0, undefined)).toEqual({ pct: null, direction: "none" })
  })

  it('returns direction "flat" and pct 0 when both current and prev are 0', () => {
    expect(calcTrend(0, 0)).toEqual({ pct: 0, direction: "flat" })
  })

  it('returns direction "new" and pct null when prev is 0 and current is greater than 0', () => {
    expect(calcTrend(5, 0)).toEqual({ pct: null, direction: "new" })
    expect(calcTrend(1, 0)).toEqual({ pct: null, direction: "new" })
    expect(calcTrend(1000, 0)).toEqual({ pct: null, direction: "new" })
  })

  it('returns direction "up" when current > prev (both non-zero)', () => {
    expect(calcTrend(150, 100)).toEqual({ pct: 50, direction: "up" })
    expect(calcTrend(200, 100)).toEqual({ pct: 100, direction: "up" })
    expect(calcTrend(101, 100)).toEqual({ pct: 1, direction: "up" })
  })

  it('returns direction "down" when current < prev (both non-zero)', () => {
    expect(calcTrend(50, 100)).toEqual({ pct: -50, direction: "down" })
    expect(calcTrend(0, 100)).toEqual({ pct: -100, direction: "down" })
    expect(calcTrend(1, 100)).toEqual({ pct: -99, direction: "down" })
  })

  it('returns direction "flat" and pct 0 when current equals prev (both non-zero)', () => {
    expect(calcTrend(100, 100)).toEqual({ pct: 0, direction: "flat" })
    expect(calcTrend(7, 7)).toEqual({ pct: 0, direction: "flat" })
  })

  it("rounds percentage to the nearest integer", () => {
    // 10/3 ≈ 3.33... → rounds to 3
    const result = calcTrend(13, 10)
    expect(result.pct).toBe(30)

    // 1/3 ≈ 33.33... → rounds to 33
    const result2 = calcTrend(4, 3)
    expect(result2.pct).toBe(33)
  })

  it("handles large numbers correctly", () => {
    expect(calcTrend(2000, 1000)).toEqual({ pct: 100, direction: "up" })
    expect(calcTrend(500, 1000)).toEqual({ pct: -50, direction: "down" })
  })

  it("negative current value is treated as a decrease (down direction)", () => {
    // While unusual for counts, the function is purely mathematical
    expect(calcTrend(-10, 100)).toEqual({ pct: -110, direction: "down" })
  })
})
