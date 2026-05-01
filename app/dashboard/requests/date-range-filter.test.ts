/**
 * Unit tests for pure exports from date-range-filter.tsx:
 *   - PRESET_KEYS  — the canonical list of valid preset strings
 *   - getPresetRange — maps a PresetKey → { from, to } | null
 *
 * date-range-filter.tsx is a "use client" module that imports React, shadcn/ui,
 * and date-fns. The React / UI imports are mocked so the node Vitest environment
 * doesn't blow up; date-fns is used as-is (it is environment-agnostic).
 *
 * All date assertions use local midnight / end-of-day because date-fns operates
 * in the local timezone.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subWeeks,
  subMonths,
  subYears,
} from "date-fns"

// ── Mock React (must come before any module that imports it) ──────────────────
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react")
  return {
    ...actual,
    useState: vi.fn((init: unknown) => [init, vi.fn()]),
    useEffect: vi.fn(),
  }
})

// ── Mock UI components / icons that are irrelevant to pure logic ──────────────
vi.mock("@/components/ui/calendar", () => ({ Calendar: {} }))
vi.mock("@/components/ui/popover", () => ({
  Popover: {},
  PopoverContent: {},
  PopoverTrigger: {},
}))
vi.mock("@/components/ui/button", () => ({ Button: {} }))
vi.mock("@/components/ui/separator", () => ({ Separator: {} }))
vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}))
vi.mock("@tabler/icons-react", () => ({
  IconCalendar: {},
  IconChevronDown: {},
}))
vi.mock("react-day-picker", () => ({}))

// ── Module under test ─────────────────────────────────────────────────────────
import {
  PRESET_KEYS,
  getPresetRange,
  type PresetKey,
} from "./date-range-filter"

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Pin the clock to a fixed instant so date calculations are deterministic.
 * 2026-05-01 12:00:00 local time.
 */
const FIXED_NOW = new Date(2026, 4, 1, 12, 0, 0) // May 1 2026 12:00:00

// ─── PRESET_KEYS ─────────────────────────────────────────────────────────────

describe("PRESET_KEYS", () => {
  it("contains exactly 10 entries", () => {
    expect(PRESET_KEYS).toHaveLength(10)
  })

  it("includes all expected preset strings", () => {
    const expected: PresetKey[] = [
      "all_time",
      "today",
      "yesterday",
      "this_week",
      "last_week",
      "this_month",
      "last_month",
      "this_year",
      "last_year",
      "custom",
    ]
    expect(PRESET_KEYS).toEqual(expect.arrayContaining(expected))
  })

  it("has no duplicate entries", () => {
    expect(new Set(PRESET_KEYS).size).toBe(PRESET_KEYS.length)
  })
})

// ─── getPresetRange ───────────────────────────────────────────────────────────

describe("getPresetRange", () => {
  /**
   * Pin Date.now() so all calls to `new Date()` inside makePresets() return
   * the same instant, making assertions deterministic.
   */
  beforeAll(() => {
    vi.setSystemTime(FIXED_NOW)
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  // ── Null-returning presets ────────────────────────────────────────────────

  it('returns null for "all_time"', () => {
    expect(getPresetRange("all_time")).toBeNull()
  })

  it('returns null for "custom"', () => {
    expect(getPresetRange("custom")).toBeNull()
  })

  // ── today ─────────────────────────────────────────────────────────────────

  it('returns start-of-day / end-of-day for "today"', () => {
    const result = getPresetRange("today")
    expect(result).not.toBeNull()
    expect(result!.from).toEqual(startOfDay(FIXED_NOW))
    expect(result!.to).toEqual(endOfDay(FIXED_NOW))
  })

  // ── yesterday ─────────────────────────────────────────────────────────────

  it('returns start-of-day / end-of-day of yesterday for "yesterday"', () => {
    const yesterday = subDays(FIXED_NOW, 1)
    const result = getPresetRange("yesterday")
    expect(result).not.toBeNull()
    expect(result!.from).toEqual(startOfDay(yesterday))
    expect(result!.to).toEqual(endOfDay(yesterday))
  })

  // ── this_week ─────────────────────────────────────────────────────────────

  it('returns start-of-week (Monday) to end-of-day(now) for "this_week"', () => {
    const result = getPresetRange("this_week")
    expect(result).not.toBeNull()
    expect(result!.from).toEqual(startOfWeek(FIXED_NOW, { weekStartsOn: 1 }))
    expect(result!.to).toEqual(endOfDay(FIXED_NOW))
  })

  // ── last_week ─────────────────────────────────────────────────────────────

  it('returns Mon–Sun of last week for "last_week"', () => {
    const lastWeek = subWeeks(FIXED_NOW, 1)
    const result = getPresetRange("last_week")
    expect(result).not.toBeNull()
    expect(result!.from).toEqual(startOfWeek(lastWeek, { weekStartsOn: 1 }))
    expect(result!.to).toEqual(endOfWeek(lastWeek, { weekStartsOn: 1 }))
  })

  // ── this_month ────────────────────────────────────────────────────────────

  it('returns start-of-month to end-of-day(now) for "this_month"', () => {
    const result = getPresetRange("this_month")
    expect(result).not.toBeNull()
    expect(result!.from).toEqual(startOfMonth(FIXED_NOW))
    expect(result!.to).toEqual(endOfDay(FIXED_NOW))
  })

  // ── last_month ────────────────────────────────────────────────────────────

  it('returns start-of-month to end-of-month of last month for "last_month"', () => {
    const lastMonth = subMonths(FIXED_NOW, 1)
    const result = getPresetRange("last_month")
    expect(result).not.toBeNull()
    expect(result!.from).toEqual(startOfMonth(lastMonth))
    expect(result!.to).toEqual(endOfMonth(lastMonth))
  })

  // ── this_year ─────────────────────────────────────────────────────────────

  it('returns start-of-year to end-of-day(now) for "this_year"', () => {
    const result = getPresetRange("this_year")
    expect(result).not.toBeNull()
    expect(result!.from).toEqual(startOfYear(FIXED_NOW))
    expect(result!.to).toEqual(endOfDay(FIXED_NOW))
  })

  // ── last_year ─────────────────────────────────────────────────────────────

  it('returns start-of-year to end-of-year of last year for "last_year"', () => {
    const lastYear = subYears(FIXED_NOW, 1)
    const result = getPresetRange("last_year")
    expect(result).not.toBeNull()
    expect(result!.from).toEqual(startOfYear(lastYear))
    expect(result!.to).toEqual(endOfYear(lastYear))
  })

  // ── Structural invariants ─────────────────────────────────────────────────

  it("from is always before or equal to to for all range-returning presets", () => {
    const rangePresets: PresetKey[] = [
      "today",
      "yesterday",
      "this_week",
      "last_week",
      "this_month",
      "last_month",
      "this_year",
      "last_year",
    ]
    for (const key of rangePresets) {
      const result = getPresetRange(key)
      expect(result, `${key}: expected non-null result`).not.toBeNull()
      expect(
        result!.from.getTime(),
        `${key}: from should be <= to`
      ).toBeLessThanOrEqual(result!.to.getTime())
    }
  })

  it("every named range preset returns a non-null result", () => {
    const nonNullPresets: PresetKey[] = [
      "today",
      "yesterday",
      "this_week",
      "last_week",
      "this_month",
      "last_month",
      "this_year",
      "last_year",
    ]
    for (const key of nonNullPresets) {
      expect(getPresetRange(key), `${key} should return a range`).not.toBeNull()
    }
  })
})
