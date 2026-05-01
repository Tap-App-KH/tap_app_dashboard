/**
 * Unit tests for the pure `initPeriodFromParams` helper exported from page.tsx.
 *
 * page.tsx is a "use client" module with heavy Next.js / React / TanStack Query
 * dependencies. We mock everything that isn't part of the function under test so
 * the node Vitest environment can import the module cleanly.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"
import { startOfDay, endOfDay, startOfMonth, parseISO } from "date-fns"

// ── Pin the clock so date-fns calculations are deterministic ──────────────────
// 2026-05-01 12:00:00 local time  (matches currentDate context)
const FIXED_NOW = new Date(2026, 4, 1, 12, 0, 0)

// ── Mock React before any module that imports it ──────────────────────────────
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react")
  return {
    ...actual,
    useState: vi.fn((init: unknown) => [
      typeof init === "function" ? (init as () => unknown)() : init,
      vi.fn(),
    ]),
    useEffect: vi.fn(),
  }
})

// ── Next.js hooks ─────────────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  useRouter: vi.fn().mockReturnValue({ replace: vi.fn() }),
  usePathname: vi.fn().mockReturnValue("/dashboard/requests"),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
}))

// ── TanStack Query ────────────────────────────────────────────────────────────
vi.mock("@tanstack/react-query", () => ({
  useQuery: vi
    .fn()
    .mockReturnValue({ data: undefined, isLoading: false, isError: false }),
  useQueryClient: vi.fn().mockReturnValue({ invalidateQueries: vi.fn() }),
}))

// ── Auth hook ─────────────────────────────────────────────────────────────────
vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn().mockReturnValue({ jwt: null }),
}))

// ── Strapi client ─────────────────────────────────────────────────────────────
vi.mock("@/lib/strapi", () => ({
  strapiGet: vi.fn(),
  strapiPut: vi.fn(),
  resolveField: vi.fn().mockReturnValue("—"),
}))

// ── Format helpers ────────────────────────────────────────────────────────────
vi.mock("@/lib/format", () => ({
  formatDate: vi.fn().mockReturnValue(""),
  formatDateTime: vi.fn().mockReturnValue(""),
}))

// ── Request sheet ─────────────────────────────────────────────────────────────
vi.mock("./request-sheet", () => ({ RequestSheet: {} }))

// ── Utilities from this module's own siblings ─────────────────────────────────
vi.mock("./utils", () => ({
  tabFilter: vi.fn().mockReturnValue(""),
  dateFilter: vi.fn().mockReturnValue(""),
  prevDateFilter: vi.fn().mockReturnValue(""),
  calcTrend: vi.fn().mockReturnValue({ pct: 0, direction: "flat" }),
}))

// ── UI components ─────────────────────────────────────────────────────────────
vi.mock("@/components/ui/table", () => ({
  Table: {},
  TableBody: {},
  TableCell: {},
  TableHead: {},
  TableHeader: {},
  TableRow: {},
}))
vi.mock("@/components/ui/badge", () => ({ Badge: {} }))
vi.mock("@/components/ui/card", () => ({
  Card: {},
  CardContent: {},
  CardDescription: {},
  CardHeader: {},
  CardTitle: {},
}))
vi.mock("@/components/ui/skeleton", () => ({ Skeleton: {} }))
vi.mock("@/components/ui/tabs", () => ({
  Tabs: {},
  TabsContent: {},
  TabsList: {},
  TabsTrigger: {},
}))
vi.mock("@/components/ui/pagination", () => ({
  Pagination: {},
  PaginationContent: {},
  PaginationEllipsis: {},
  PaginationItem: {},
  PaginationLink: {},
  PaginationNext: {},
  PaginationPrevious: {},
}))
vi.mock("@/components/ui/button", () => ({ Button: {} }))
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: {},
  DropdownMenuContent: {},
  DropdownMenuItem: {},
  DropdownMenuSeparator: {},
  DropdownMenuTrigger: {},
}))
vi.mock("./date-range-filter", async () => {
  // Re-export the real date-range-filter logic (PRESET_KEYS, getPresetRange)
  // while stubbing the React component.
  const actual = await vi.importActual<typeof import("./date-range-filter")>(
    "./date-range-filter"
  )
  return {
    ...actual,
    DateRangeFilter: {},
  }
})
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@tabler/icons-react", () => ({
  IconArrowUpRight: {},
  IconArrowDownRight: {},
  IconMinus: {},
  IconArrowBackUp: {},
  IconCalendarEvent: {},
  IconCircleCheck: {},
  IconCircleX: {},
  IconCreditCard: {},
  IconCopy: {},
  IconCheck: {},
  IconPlus: {},
  IconDotsVertical: {},
  IconReceiptRefund: {},
}))

// ── Module under test ─────────────────────────────────────────────────────────
import { initPeriodFromParams } from "./page"

// ─── initPeriodFromParams ─────────────────────────────────────────────────────

describe("initPeriodFromParams", () => {
  beforeAll(() => {
    vi.setSystemTime(FIXED_NOW)
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  // ── Default (no params) ───────────────────────────────────────────────────

  it("defaults to this_month when no params are present", () => {
    const result = initPeriodFromParams(new URLSearchParams())
    expect(result.preset).toBe("this_month")
    expect(result.from).toEqual(startOfMonth(FIXED_NOW))
    expect(result.to).toEqual(endOfDay(FIXED_NOW))
  })

  // ── Named presets ─────────────────────────────────────────────────────────

  it('parses ?period=today → preset "today" with start/end of today', () => {
    const result = initPeriodFromParams(new URLSearchParams("period=today"))
    expect(result.preset).toBe("today")
    expect(result.from).toEqual(startOfDay(FIXED_NOW))
    expect(result.to).toEqual(endOfDay(FIXED_NOW))
  })

  it('parses ?period=yesterday → preset "yesterday" with correct dates', () => {
    const result = initPeriodFromParams(new URLSearchParams("period=yesterday"))
    expect(result.preset).toBe("yesterday")
    // yesterday relative to the pinned clock (Apr 30 2026)
    const yesterday = new Date(2026, 3, 30)
    expect(result.from).toEqual(startOfDay(yesterday))
    expect(result.to).toEqual(endOfDay(yesterday))
  })

  it('parses ?period=this_week → preset "this_week"', () => {
    const result = initPeriodFromParams(new URLSearchParams("period=this_week"))
    expect(result.preset).toBe("this_week")
    expect(result.from).toBeDefined()
    expect(result.to).toBeDefined()
  })

  it('parses ?period=last_week → preset "last_week"', () => {
    const result = initPeriodFromParams(new URLSearchParams("period=last_week"))
    expect(result.preset).toBe("last_week")
    expect(result.from).toBeDefined()
    expect(result.to).toBeDefined()
  })

  it('parses ?period=last_month → preset "last_month"', () => {
    const result = initPeriodFromParams(
      new URLSearchParams("period=last_month")
    )
    expect(result.preset).toBe("last_month")
    expect(result.from).toBeDefined()
    expect(result.to).toBeDefined()
  })

  it('parses ?period=this_year → preset "this_year"', () => {
    const result = initPeriodFromParams(new URLSearchParams("period=this_year"))
    expect(result.preset).toBe("this_year")
    expect(result.from).toBeDefined()
    expect(result.to).toBeDefined()
  })

  it('parses ?period=last_year → preset "last_year"', () => {
    const result = initPeriodFromParams(new URLSearchParams("period=last_year"))
    expect(result.preset).toBe("last_year")
    expect(result.from).toBeDefined()
    expect(result.to).toBeDefined()
  })

  // ── all_time ─────────────────────────────────────────────────────────────

  it('parses ?period=all_time → { preset: "all_time", from: undefined, to: undefined }', () => {
    const result = initPeriodFromParams(new URLSearchParams("period=all_time"))
    expect(result.preset).toBe("all_time")
    expect(result.from).toBeUndefined()
    expect(result.to).toBeUndefined()
  })

  // ── custom ────────────────────────────────────────────────────────────────

  it('parses ?period=custom&from=2026-04-01&to=2026-04-15 → { preset: "custom", from: Apr 1, to: Apr 15 }', () => {
    const params = new URLSearchParams(
      "period=custom&from=2026-04-01&to=2026-04-15"
    )
    const result = initPeriodFromParams(params)
    expect(result.preset).toBe("custom")
    expect(result.from).toEqual(parseISO("2026-04-01"))
    expect(result.to).toEqual(parseISO("2026-04-15"))
  })

  it("parses ?period=custom with only from → to is undefined", () => {
    const params = new URLSearchParams("period=custom&from=2026-03-10")
    const result = initPeriodFromParams(params)
    expect(result.preset).toBe("custom")
    expect(result.from).toEqual(parseISO("2026-03-10"))
    expect(result.to).toBeUndefined()
  })

  it("parses ?period=custom with only to → from is undefined", () => {
    const params = new URLSearchParams("period=custom&to=2026-03-20")
    const result = initPeriodFromParams(params)
    expect(result.preset).toBe("custom")
    expect(result.from).toBeUndefined()
    expect(result.to).toEqual(parseISO("2026-03-20"))
  })

  it("parses ?period=custom with no from/to → both undefined", () => {
    const params = new URLSearchParams("period=custom")
    const result = initPeriodFromParams(params)
    expect(result.preset).toBe("custom")
    expect(result.from).toBeUndefined()
    expect(result.to).toBeUndefined()
  })

  // ── Invalid / unknown period values ───────────────────────────────────────

  it('unknown ?period=garbage → defaults to "this_month"', () => {
    const result = initPeriodFromParams(new URLSearchParams("period=garbage"))
    expect(result.preset).toBe("this_month")
    expect(result.from).toEqual(startOfMonth(FIXED_NOW))
    expect(result.to).toEqual(endOfDay(FIXED_NOW))
  })

  it('empty string ?period= → defaults to "this_month"', () => {
    const result = initPeriodFromParams(new URLSearchParams("period="))
    expect(result.preset).toBe("this_month")
  })

  it('SQL-injection-like string → defaults to "this_month"', () => {
    const result = initPeriodFromParams(
      new URLSearchParams("period='; DROP TABLE requests;--")
    )
    expect(result.preset).toBe("this_month")
  })

  // ── Structural invariants for all named presets ───────────────────────────

  it("from is always a Date (not undefined) for all named range presets", () => {
    const rangePresets = [
      "today",
      "yesterday",
      "this_week",
      "last_week",
      "this_month",
      "last_month",
      "this_year",
      "last_year",
    ] as const
    for (const preset of rangePresets) {
      const result = initPeriodFromParams(
        new URLSearchParams(`period=${preset}`)
      )
      expect(result.from, `${preset}: from should be defined`).toBeDefined()
      expect(result.to, `${preset}: to should be defined`).toBeDefined()
    }
  })
})
