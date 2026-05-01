"use client"

import { useState } from "react"
import {
  format,
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
  isSameDay,
} from "date-fns"
import type { DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { IconCalendar, IconChevronDown } from "@tabler/icons-react"

// ─── Presets ─────────────────────────────────────────────────────────────────

export type PresetKey =
  | "all_time"
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "last_year"
  | "custom"

export const PRESET_KEYS: PresetKey[] = [
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

interface Preset {
  key: PresetKey
  label: string
  getRange: () => { from: Date; to: Date } | null
}

function makePresets(): Preset[] {
  const now = new Date()
  return [
    {
      key: "all_time",
      label: "All time",
      getRange: () => null,
    },
    {
      key: "today",
      label: "Today",
      getRange: () => ({ from: startOfDay(now), to: endOfDay(now) }),
    },
    {
      key: "yesterday",
      label: "Yesterday",
      getRange: () => {
        const d = subDays(now, 1)
        return { from: startOfDay(d), to: endOfDay(d) }
      },
    },
    {
      key: "this_week",
      label: "This week",
      getRange: () => ({
        from: startOfWeek(now, { weekStartsOn: 1 }),
        to: endOfDay(now),
      }),
    },
    {
      key: "last_week",
      label: "Last week",
      getRange: () => {
        const d = subWeeks(now, 1)
        return {
          from: startOfWeek(d, { weekStartsOn: 1 }),
          to: endOfWeek(d, { weekStartsOn: 1 }),
        }
      },
    },
    {
      key: "this_month",
      label: "This month",
      getRange: () => ({ from: startOfMonth(now), to: endOfDay(now) }),
    },
    {
      key: "last_month",
      label: "Last month",
      getRange: () => {
        const d = subMonths(now, 1)
        return { from: startOfMonth(d), to: endOfMonth(d) }
      },
    },
    {
      key: "this_year",
      label: "This year",
      getRange: () => ({ from: startOfYear(now), to: endOfDay(now) }),
    },
    {
      key: "last_year",
      label: "Last year",
      getRange: () => {
        const d = subYears(now, 1)
        return { from: startOfYear(d), to: endOfYear(d) }
      },
    },
    {
      key: "custom",
      label: "Custom",
      getRange: () => null,
    },
  ]
}

export function getPresetRange(
  key: PresetKey
): { from: Date; to: Date } | null {
  return (
    makePresets()
      .find((p) => p.key === key)
      ?.getRange() ?? null
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTriggerLabel(
  from: Date | undefined,
  to: Date | undefined,
  presetKey: PresetKey,
  presets: Preset[]
): string {
  if (presetKey === "all_time") return "All time"
  if (presetKey !== "custom") {
    return presets.find((p) => p.key === presetKey)?.label ?? "All time"
  }
  // Custom — show the actual dates
  if (from && to) {
    if (isSameDay(from, to)) return format(from, "d MMM yyyy")
    return `${format(from, "d MMM yyyy")} – ${format(to, "d MMM yyyy")}`
  }
  if (from) return `From ${format(from, "d MMM yyyy")}`
  if (to) return `Until ${format(to, "d MMM yyyy")}`
  return "Custom"
}

// ─── Component ───────────────────────────────────────────────────────────────

export interface DateRangeFilterProps {
  from: Date | undefined
  to: Date | undefined
  preset: PresetKey
  onChange: (
    from: Date | undefined,
    to: Date | undefined,
    preset: PresetKey
  ) => void
}

export function DateRangeFilter({
  from,
  to,
  preset,
  onChange,
}: DateRangeFilterProps) {
  const [open, setOpen] = useState(false)
  const [activePreset, setActivePreset] = useState<PresetKey>(preset)
  // Local draft for custom range — only committed on "Apply"
  const [customRange, setCustomRange] = useState<DateRange | undefined>(
    from || to ? { from, to } : undefined
  )

  const PRESETS = makePresets()
  const isFiltered = from !== undefined || to !== undefined

  function handlePresetClick(p: Preset) {
    setActivePreset(p.key)
    if (p.key === "custom") return // stay open, let user pick dates
    const r = p.getRange()
    setCustomRange(undefined)
    onChange(r?.from, r?.to, p.key)
    setOpen(false)
  }

  function handleApplyCustom() {
    onChange(customRange?.from, customRange?.to, "custom")
    setOpen(false)
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      // Sync from controlled preset prop to avoid mismatches (e.g. May 1st: "today" == "this_month")
      setActivePreset(preset)
      setCustomRange(from || to ? { from, to } : undefined)
    }
    setOpen(next)
  }

  const triggerLabel = formatTriggerLabel(from, to, activePreset, PRESETS)

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 font-normal",
            !isFiltered && "text-muted-foreground"
          )}
        >
          <IconCalendar className="size-4" />
          {triggerLabel}
          <IconChevronDown className="size-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          {/* Left: preset list */}
          <div className="flex w-36 flex-col gap-0.5 p-2">
            {PRESETS.map((p, i) => {
              const isLast = i === PRESETS.length - 1
              return (
                <div key={p.key}>
                  {isLast && <Separator className="my-1" />}
                  <button
                    className={cn(
                      "w-full rounded px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                      activePreset === p.key &&
                        "bg-accent font-medium text-accent-foreground"
                    )}
                    onClick={() => handlePresetClick(p)}
                  >
                    {p.label}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Right: calendar — only shown for custom */}
          {activePreset === "custom" && (
            <>
              <Separator orientation="vertical" />
              <div className="flex flex-col">
                <Calendar
                  mode="range"
                  selected={customRange}
                  onSelect={setCustomRange}
                  numberOfMonths={2}
                  autoFocus
                />
                <Separator />
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    {customRange?.from && customRange?.to
                      ? `${format(customRange.from, "d MMM yyyy")} – ${format(customRange.to, "d MMM yyyy")}`
                      : customRange?.from
                        ? `From ${format(customRange.from, "d MMM yyyy")}`
                        : "Select a date range"}
                  </span>
                  <Button
                    size="sm"
                    disabled={!customRange?.from}
                    onClick={handleApplyCustom}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
