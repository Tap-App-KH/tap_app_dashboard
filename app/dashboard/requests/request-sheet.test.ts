/**
 * Tests for the pure `toFormValues` function exported from request-sheet.tsx.
 *
 * This module has a "use client" directive but toFormValues is a pure
 * transformation — no browser APIs or React hooks. We import it directly
 * in the node Vitest environment without rendering any components.
 *
 * Several transitive imports pull in shadcn/ui, @tabler/icons-react, and
 * react-hook-form which expect a browser / React DOM environment. We mock
 * those modules so Vitest's node environment doesn't blow up.
 */

import { describe, it, expect, vi } from "vitest"

// ── Mock React (must come before any module that imports it) ─────────────────
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react")
  return {
    ...actual,
    useState: vi.fn((init: unknown) => [init, vi.fn()]),
    useEffect: vi.fn(),
  }
})

// ── Mock UI / icon libraries that have no relevance to the pure function ─────
vi.mock("@/components/ui/sheet", () => ({
  Sheet: {},
  SheetContent: {},
  SheetDescription: {},
  SheetHeader: {},
  SheetFooter: {},
  SheetTitle: {},
}))
vi.mock("@/components/ui/button", () => ({ Button: {} }))
vi.mock("@/components/ui/input", () => ({ Input: {} }))
vi.mock("@/components/ui/label", () => ({ Label: {} }))
vi.mock("@/components/ui/separator", () => ({ Separator: {} }))
vi.mock("@/components/ui/checkbox", () => ({ Checkbox: {} }))
vi.mock("@/components/ui/textarea", () => ({ Textarea: {} }))
vi.mock("@/components/ui/popover", () => ({
  Popover: {},
  PopoverContent: {},
  PopoverTrigger: {},
}))
vi.mock("@/components/ui/command", () => ({
  Command: {},
  CommandEmpty: {},
  CommandGroup: {},
  CommandInput: {},
  CommandItem: {},
  CommandList: {},
}))
vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}))
vi.mock("@/lib/country-codes", () => ({
  COUNTRY_CODES: [
    { country: "Cambodia", code: "+855", flag: "🇰🇭" },
    { country: "France", code: "+33", flag: "🇫🇷" },
  ],
  flagToIso: (flag: string): string => {
    const map: Record<string, string> = { "🇰🇭": "kh", "🇫🇷": "fr" }
    return map[flag] ?? "kh"
  },
}))
vi.mock("@tabler/icons-react", () => ({
  IconBrandTelegram: {},
  IconBrandWhatsapp: {},
  IconCalendar: {},
  IconCheck: {},
  IconChevronDown: {},
  IconClock: {},
}))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn().mockReturnValue({ data: undefined }),
}))
vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn().mockReturnValue({ jwt: null }),
}))
vi.mock("react-hook-form", () => ({
  useForm: vi.fn().mockReturnValue({
    register: vi.fn(),
    handleSubmit: vi.fn(),
    reset: vi.fn(),
    watch: vi.fn().mockReturnValue(undefined),
    setValue: vi.fn(),
    control: {},
    formState: { errors: {}, isSubmitting: false },
  }),
  Controller: {},
}))
vi.mock("@hookform/resolvers/zod", () => ({ zodResolver: vi.fn() }))

// ── Actual import under test ──────────────────────────────────────────────────
import { toFormValues } from "./request-sheet"
import type { Request } from "@/lib/strapi"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(overrides: Partial<Request["attributes"]> = {}): Request {
  return {
    id: 1,
    attributes: {
      ref_id: "TT-AABBCCDDEE",
      accepted: false,
      cancelled: false,
      paid: false,
      date: "2025-06-15",
      temp_user_id: null,
      createdAt: "2025-06-01T10:00:00.000Z",
      updatedAt: "2025-06-01T10:00:00.000Z",
      requester_details: {
        fullname: "Jane Smith",
        phone: "12345678",
        phoneCode: { flag: "kh", label: "+855", value: "+855" },
        sex: "female",
        nationality: "cambodian",
        age: "30",
        email: "jane@example.com",
        whatsapp: "+85512345678",
        telegram: "@janesmith",
        hasPet: true,
        needsBabySeat: false,
        wishes: "Window seat please",
      },
      pickup_dropoff_details: {
        pickup: "Phnom Penh Airport",
        dropoff: "Siem Reap Hotel",
        pickupTime: "09:30",
        pickupDate: "2025-06-15",
      },
      transfer_details: {
        costPrice: 45,
        price: 60,
        type: "private",
        from: { id: "10" },
        to: { id: "20" },
        provider: { data: { id: "5" } },
      },
      ...overrides,
    },
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("toFormValues", () => {
  describe("full request with all fields populated", () => {
    it("maps requester_details fields correctly", () => {
      const req = makeRequest()
      const form = toFormValues(req)

      expect(form.fullname).toBe("Jane Smith")
      expect(form.sex).toBe("female")
      expect(form.nationality).toBe("cambodian")
      expect(form.age).toBe("30")
      expect(form.phone).toBe("12345678")
      expect(form.email).toBe("jane@example.com")
      expect(form.whatsapp).toBe("+85512345678")
      expect(form.telegram).toBe("@janesmith")
      expect(form.hasPet).toBe(true)
      expect(form.needsBabySeat).toBe(false)
      expect(form.wishes).toBe("Window seat please")
    })

    it("reads phoneCode from rd.phoneCode.flag (ISO code, not dial code string)", () => {
      const req = makeRequest()
      const form = toFormValues(req)

      // Must be "kh" (the flag/ISO field), not "+855"
      expect(form.phoneCode).toBe("kh")
    })

    it("reads pickupDate from a.date, not from pickup_dropoff_details.pickupDate", () => {
      // Give pickup_dropoff_details a different date to verify the authoritative source is a.date
      const req = makeRequest({
        date: "2025-06-15",
        pickup_dropoff_details: {
          pickup: "Airport",
          dropoff: "Hotel",
          pickupTime: "10:00",
          pickupDate: "2025-01-01", // intentionally different
        },
      })
      const form = toFormValues(req)

      expect(form.pickupDate).toBe("2025-06-15")
    })

    it("maps pickup and dropoff from pickup_dropoff_details", () => {
      const req = makeRequest()
      const form = toFormValues(req)

      expect(form.pickup).toBe("Phnom Penh Airport")
      expect(form.dropoff).toBe("Siem Reap Hotel")
    })

    it("resolves pickupTime from pickup_dropoff_details as a plain string", () => {
      const req = makeRequest()
      const form = toFormValues(req)

      expect(form.pickupTime).toBe("09:30")
    })

    it("resolves pickupTime from a { label, value } object", () => {
      const req = makeRequest({
        pickup_dropoff_details: {
          pickup: "Airport",
          dropoff: "Hotel",
          pickupTime: { label: "09:30", value: "09:30" },
          pickupDate: "2025-06-15",
        },
      })
      const form = toFormValues(req)

      expect(form.pickupTime).toBe("09:30")
    })

    it("sets pickupTime to empty string when pickupTime resolves to em dash", () => {
      const req = makeRequest({
        pickup_dropoff_details: {
          pickup: "Airport",
          dropoff: "Hotel",
          pickupTime: null,
          pickupDate: "2025-06-15",
        },
      })
      const form = toFormValues(req)

      expect(form.pickupTime).toBe("")
    })

    it("maps transfer_details fields correctly", () => {
      const req = makeRequest()
      const form = toFormValues(req)

      expect(form.costPrice).toBe("45")
      expect(form.price).toBe("60")
      expect(form.transferType).toBe("private")
      expect(form.fromPlaceId).toBe("10")
      expect(form.toPlaceId).toBe("20")
      expect(form.driverId).toBe("5")
    })
  })

  describe("request with null/undefined optional fields", () => {
    it("defaults string fields to empty strings when requester_details is null", () => {
      const req = makeRequest({ requester_details: null })
      const form = toFormValues(req)

      expect(form.fullname).toBe("")
      expect(form.phone).toBe("")
      expect(form.email).toBe("")
      expect(form.whatsapp).toBe("")
      expect(form.telegram).toBe("")
      expect(form.age).toBe("")
      expect(form.wishes).toBe("")
    })

    it("defaults sex and nationality to undefined when missing", () => {
      const req = makeRequest({ requester_details: null })
      const form = toFormValues(req)

      expect(form.sex).toBeUndefined()
      expect(form.nationality).toBeUndefined()
    })

    it("defaults boolean fields to false when requester_details is null", () => {
      const req = makeRequest({ requester_details: null })
      const form = toFormValues(req)

      expect(form.hasPet).toBe(false)
      expect(form.needsBabySeat).toBe(false)
    })

    it("defaults phoneCode to 'kh' when phoneCode is missing in requester_details", () => {
      const req = makeRequest({
        requester_details: {
          fullname: "Bob",
          phone: "999",
          wishes: "",
          // phoneCode intentionally omitted
        },
      })
      const form = toFormValues(req)

      expect(form.phoneCode).toBe("kh")
    })

    it("defaults pickup and dropoff to empty strings when pickup_dropoff_details is null", () => {
      const req = makeRequest({ pickup_dropoff_details: null })
      const form = toFormValues(req)

      expect(form.pickup).toBe("")
      expect(form.dropoff).toBe("")
      expect(form.pickupTime).toBe("")
    })

    it("defaults pickupDate to empty string when a.date is null", () => {
      const req = makeRequest({ date: null })
      const form = toFormValues(req)

      expect(form.pickupDate).toBe("")
    })

    it("defaults costPrice to empty string when null", () => {
      const req = makeRequest({
        transfer_details: {
          costPrice: null,
          price: 50,
          type: "shared",
          from: null,
          to: null,
          provider: null,
        },
      })
      const form = toFormValues(req)

      expect(form.costPrice).toBe("")
    })

    it("defaults price to empty string when null", () => {
      const req = makeRequest({
        transfer_details: {
          costPrice: null,
          price: null,
          type: null,
          from: null,
          to: null,
          provider: null,
        },
      })
      const form = toFormValues(req)

      expect(form.price).toBe("")
    })

    it("defaults fromPlaceId and toPlaceId to empty strings when from/to are null", () => {
      const req = makeRequest({
        transfer_details: {
          costPrice: null,
          price: null,
          type: null,
          from: null,
          to: null,
          provider: null,
        },
      })
      const form = toFormValues(req)

      expect(form.fromPlaceId).toBe("")
      expect(form.toPlaceId).toBe("")
    })

    it("defaults driverId to empty string when provider is null", () => {
      const req = makeRequest({
        transfer_details: {
          costPrice: null,
          price: null,
          type: null,
          from: null,
          to: null,
          provider: null,
        },
      })
      const form = toFormValues(req)

      expect(form.driverId).toBe("")
    })

    it("defaults transferType to undefined when type is null", () => {
      const req = makeRequest({
        transfer_details: {
          costPrice: null,
          price: null,
          type: null,
          from: null,
          to: null,
          provider: null,
        },
      })
      const form = toFormValues(req)

      expect(form.transferType).toBeUndefined()
    })

    it("defaults all transfer fields when transfer_details is null", () => {
      const req = makeRequest({ transfer_details: null })
      const form = toFormValues(req)

      expect(form.costPrice).toBe("")
      expect(form.price).toBe("")
      expect(form.transferType).toBeUndefined()
      expect(form.fromPlaceId).toBe("")
      expect(form.toPlaceId).toBe("")
      expect(form.driverId).toBe("")
    })
  })

  describe("phoneCode restoration from ISO flag field", () => {
    it("uses the flag field (ISO code) from phoneCode object", () => {
      const req = makeRequest({
        requester_details: {
          fullname: "Alice",
          phone: "000",
          phoneCode: { flag: "fr", label: "+33", value: "+33" },
          wishes: "",
        },
      })
      const form = toFormValues(req)

      // Must be "fr" — the ISO code — not "+33"
      expect(form.phoneCode).toBe("fr")
      expect(form.phoneCode).not.toBe("+33")
    })
  })

  describe("costPrice and price as string conversions", () => {
    it("converts numeric costPrice to string", () => {
      const req = makeRequest({
        transfer_details: {
          costPrice: 12.5,
          price: 25,
          type: "private",
          from: null,
          to: null,
          provider: null,
        },
      })
      const form = toFormValues(req)

      expect(form.costPrice).toBe("12.5")
      expect(form.price).toBe("25")
    })

    it("converts zero costPrice to '0' (not empty string)", () => {
      const req = makeRequest({
        transfer_details: {
          costPrice: 0,
          price: 0,
          type: null,
          from: null,
          to: null,
          provider: null,
        },
      })
      const form = toFormValues(req)

      expect(form.costPrice).toBe("0")
      expect(form.price).toBe("0")
    })
  })
})
