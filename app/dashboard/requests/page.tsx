"use client"

import { useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { format, parseISO } from "date-fns"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { RequestSheet } from "./request-sheet"
import {
  tabFilter,
  dateFilter,
  prevDateFilter,
  calcTrend,
  type Tab,
} from "./utils"
import {
  strapiGet,
  strapiPut,
  resolveField,
  type StrapiResponse,
  type Request,
} from "@/lib/strapi"
import { formatDate, formatDateTime } from "@/lib/format"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Button } from "@/components/ui/button"
import {
  DateRangeFilter,
  type PresetKey,
  PRESET_KEYS,
  getPresetRange,
} from "./date-range-filter"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import {
  IconArrowUpRight,
  IconArrowDownRight,
  IconMinus,
  IconArrowBackUp,
  IconCalendarEvent,
  IconCircleCheck,
  IconCircleX,
  IconCreditCard,
  IconCopy,
  IconCheck,
  IconPlus,
  IconDotsVertical,
  IconReceiptRefund,
} from "@tabler/icons-react"

const PAGE_SIZE = 20

function useCount(
  filter: string,
  jwt: string | null,
  dateQs: string,
  skip = false
) {
  return useQuery({
    queryKey: ["requests-count", filter, dateQs],
    queryFn: () =>
      strapiGet<StrapiResponse<Request[]>>(
        `/api/requests?pagination[pageSize]=1&pagination[page]=1${filter}${dateQs}`,
        jwt ?? undefined
      ),
    enabled: !!jwt && !skip,
    staleTime: 30_000,
  })
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ attrs }: { attrs: Request["attributes"] }) {
  if (attrs.cancelled) return <Badge variant="destructive">Cancelled</Badge>
  if (attrs.accepted && attrs.paid)
    return (
      <div className="flex gap-1">
        <Badge variant="secondary">Accepted</Badge>
        <Badge className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600">
          Paid
        </Badge>
      </div>
    )
  if (attrs.accepted) return <Badge variant="secondary">Accepted</Badge>
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Pending
    </Badge>
  )
}

function TrendBadge({
  current,
  prev,
}: {
  current: number
  prev: number | undefined
}) {
  const { pct, direction } = calcTrend(current, prev)

  if (direction === "none") return null

  if (direction === "new")
    return (
      <span className="flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400">
        <IconArrowUpRight className="size-3" />
        New
      </span>
    )

  if (direction === "flat")
    return (
      <span className="flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        <IconMinus className="size-3" />
        0%
      </span>
    )

  if (direction === "up")
    return (
      <span className="flex items-center gap-0.5 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
        <IconArrowUpRight className="size-3" />
        {pct}%
      </span>
    )

  return (
    <span className="flex items-center gap-0.5 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
      <IconArrowDownRight className="size-3" />
      {Math.abs(pct!)}%
    </span>
  )
}

function StatCard({
  title,
  value,
  prev,
  description,
  detail,
  icon: Icon,
  loading,
}: {
  title: string
  value: number
  prev: number | undefined
  description: string
  detail: string
  icon: React.ElementType
  loading: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <TrendBadge current={value} prev={prev} />
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {loading ? (
          <>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="mt-1 h-3 w-32" />
          </>
        ) : (
          <>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            <p className="flex items-center gap-1 text-sm font-medium">
              <Icon className="size-3.5" />
              {description}
            </p>
            <CardDescription className="text-xs">{detail}</CardDescription>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function TablePagination({
  page,
  pageCount,
  onPage,
}: {
  page: number
  pageCount: number
  onPage: (p: number) => void
}) {
  if (pageCount <= 1) return null

  // Build visible page numbers: always show first, last, current ±1
  const pages: (number | "ellipsis")[] = []
  const add = (n: number) => {
    if (n >= 1 && n <= pageCount && !pages.includes(n)) pages.push(n)
  }
  add(1)
  if (page - 2 > 2) pages.push("ellipsis")
  add(page - 1)
  add(page)
  add(page + 1)
  if (page + 2 < pageCount - 1) pages.push("ellipsis")
  add(pageCount)

  return (
    <Pagination className="w-auto">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault()
              onPage(Math.max(1, page - 1))
            }}
            aria-disabled={page === 1}
            className={page === 1 ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>

        {pages.map((p, i) =>
          p === "ellipsis" ? (
            <PaginationItem key={`e-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink
                href="#"
                isActive={p === page}
                onClick={(e) => {
                  e.preventDefault()
                  onPage(p)
                }}
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault()
              onPage(Math.min(pageCount, page + 1))
            }}
            aria-disabled={page === pageCount}
            className={
              page === pageCount ? "pointer-events-none opacity-50" : ""
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function initPeriodFromParams(params: URLSearchParams): {
  preset: PresetKey
  from: Date | undefined
  to: Date | undefined
} {
  const raw = params.get("period") as PresetKey | null
  const preset: PresetKey =
    raw && PRESET_KEYS.includes(raw) ? raw : "this_month"

  if (preset === "all_time") return { preset, from: undefined, to: undefined }

  if (preset === "custom") {
    const fromStr = params.get("from")
    const toStr = params.get("to")
    return {
      preset,
      from: fromStr ? parseISO(fromStr) : undefined,
      to: toStr ? parseISO(toStr) : undefined,
    }
  }

  const range = getPresetRange(preset)
  return { preset, from: range?.from, to: range?.to }
}

export default function RequestsPage() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<Tab>("all")
  const [page, setPage] = useState(1)

  const [activePeriod, setActivePeriod] = useState<PresetKey>(
    () => initPeriodFromParams(searchParams).preset
  )
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    () => initPeriodFromParams(searchParams).from
  )
  const [dateTo, setDateTo] = useState<Date | undefined>(
    () => initPeriodFromParams(searchParams).to
  )
  const [copied, setCopied] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRequest, setEditingRequest] = useState<Request | undefined>()

  function copyBookingUrl() {
    const url = `${window.location.origin}/book`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function openCreate() {
    setEditingRequest(undefined)
    setSheetOpen(true)
  }

  function openEdit(req: Request) {
    setEditingRequest(req)
    setSheetOpen(true)
  }

  function handleSuccess() {
    queryClient.invalidateQueries({ queryKey: ["requests"] })
    queryClient.invalidateQueries({ queryKey: ["requests-count"] })
  }

  async function updateStatus(
    req: Request,
    patch: Partial<
      Pick<Request["attributes"], "accepted" | "paid" | "cancelled">
    >,
    label: string
  ) {
    try {
      await strapiPut<StrapiResponse<Request>>(
        `/api/requests/${req.id}`,
        { data: patch },
        auth.jwt!
      )
      toast.success(label)
      handleSuccess()
    } catch {
      toast.error(`Failed: ${label}`)
    }
  }

  // Stat counts (lightweight — pageSize=1, just reads meta.pagination.total)
  const df = dateFilter(dateFrom, dateTo)
  const pdf = prevDateFilter(dateFrom, dateTo)
  const { data: allStats, isLoading: statsLoading } = useCount("", auth.jwt, df)
  const { data: acceptedStats } = useCount(tabFilter("accepted"), auth.jwt, df)
  const { data: cancelledStats } = useCount(
    tabFilter("cancelled"),
    auth.jwt,
    df
  )
  const { data: paidStats } = useCount("&filters[paid][$eq]=true", auth.jwt, df)

  // Previous period counts for trend badges (only when a date filter is active)
  const hasPdf = pdf !== ""
  const { data: prevAllStats } = useCount("", auth.jwt, pdf, !hasPdf)
  const { data: prevAcceptedStats } = useCount(
    tabFilter("accepted"),
    auth.jwt,
    pdf,
    !hasPdf
  )
  const { data: prevCancelledStats } = useCount(
    tabFilter("cancelled"),
    auth.jwt,
    pdf,
    !hasPdf
  )
  const { data: prevPaidStats } = useCount(
    "&filters[paid][$eq]=true",
    auth.jwt,
    pdf,
    !hasPdf
  )

  const total = allStats?.meta.pagination?.total ?? 0
  const acceptedTotal = acceptedStats?.meta.pagination?.total ?? 0
  const cancelledTotal = cancelledStats?.meta.pagination?.total ?? 0
  const paidTotal = paidStats?.meta.pagination?.total ?? 0

  const prevTotal = hasPdf
    ? (prevAllStats?.meta.pagination?.total ?? 0)
    : undefined
  const prevAcceptedTotal = hasPdf
    ? (prevAcceptedStats?.meta.pagination?.total ?? 0)
    : undefined
  const prevCancelledTotal = hasPdf
    ? (prevCancelledStats?.meta.pagination?.total ?? 0)
    : undefined
  const prevPaidTotal = hasPdf
    ? (prevPaidStats?.meta.pagination?.total ?? 0)
    : undefined
  // Main paginated table query
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["requests", activeTab, page, df],
    queryFn: () =>
      strapiGet<StrapiResponse<Request[]>>(
        `/api/requests?populate=*&sort=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=${PAGE_SIZE}${tabFilter(activeTab)}${df}`,
        auth.jwt ?? undefined
      ),
    enabled: !!auth.jwt,
  })

  const requests = data?.data ?? []
  const pageCount = data?.meta.pagination?.pageCount ?? 1
  const tabTotal = data?.meta.pagination?.total ?? 0

  function handleTabChange(tab: string) {
    setActiveTab(tab as Tab)
    setPage(1)
  }

  function handleDateChange(
    from: Date | undefined,
    to: Date | undefined,
    preset: PresetKey
  ) {
    setDateFrom(from)
    setDateTo(to)
    setActivePeriod(preset)
    setPage(1)

    const params = new URLSearchParams(searchParams.toString())
    if (preset === "all_time") {
      params.delete("period")
      params.delete("from")
      params.delete("to")
    } else if (preset === "custom") {
      params.set("period", "custom")
      if (from) params.set("from", format(from, "yyyy-MM-dd"))
      else params.delete("from")
      if (to) params.set("to", format(to, "yyyy-MM-dd"))
      else params.delete("to")
    } else {
      params.set("period", preset)
      params.delete("from")
      params.delete("to")
    }
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false })
  }

  const TABS: { value: Tab; label: string; count: number }[] = [
    { value: "all", label: "All", count: total },
    { value: "accepted", label: "Accepted", count: acceptedTotal },
    { value: "paid", label: "Paid", count: paidTotal },
    { value: "cancelled", label: "Cancelled", count: cancelledTotal },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">Booking Requests</h1>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            preset={activePeriod}
            onChange={handleDateChange}
          />
          <div className="h-5 w-px bg-border" />
          <Button size="sm" onClick={openCreate} className="gap-2">
            <IconPlus className="size-4" />
            New Request
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={copyBookingUrl}
            className="gap-2"
          >
            {copied ? (
              <>
                <IconCheck className="size-4 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <IconCopy className="size-4" />
                Copy booking URL
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Requests"
          value={total}
          prev={prevTotal}
          description="All booking requests"
          detail="Across all statuses"
          icon={IconCalendarEvent}
          loading={statsLoading}
        />
        <StatCard
          title="Accepted"
          value={acceptedTotal}
          prev={prevAcceptedTotal}
          description="Confirmed bookings"
          detail="Ready for transfer"
          icon={IconCircleCheck}
          loading={statsLoading}
        />
        <StatCard
          title="Paid"
          value={paidTotal}
          prev={prevPaidTotal}
          description="Completed payments"
          detail="Revenue confirmed"
          icon={IconCreditCard}
          loading={statsLoading}
        />
        <StatCard
          title="Cancelled"
          value={cancelledTotal}
          prev={prevCancelledTotal}
          description="Cancelled requests"
          detail="No action needed"
          icon={IconCircleX}
          loading={statsLoading}
        />
      </div>

      {/* Table with tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
              <span className="ml-1.5 rounded-full bg-foreground/10 px-1.5 py-0.5 text-xs text-muted-foreground tabular-nums">
                {t.count}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4 min-w-0">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {isError && (
                  <p className="px-6 py-12 text-center text-sm text-destructive">
                    {error instanceof Error
                      ? error.message
                      : "Failed to load requests"}
                  </p>
                )}

                {isLoading && (
                  <div className="flex flex-col divide-y">
                    {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 px-6 py-4"
                      >
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="ml-auto h-4 w-20" />
                      </div>
                    ))}
                  </div>
                )}

                {!isLoading && !isError && (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-36 pl-6">Ref ID</TableHead>
                            <TableHead>Passenger</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>From</TableHead>
                            <TableHead>To</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead>Pickup At</TableHead>
                            <TableHead>Submitted At</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-10 pr-6" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {requests.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={11}
                                className="py-12 text-center text-muted-foreground"
                              >
                                No requests in this category
                              </TableCell>
                            </TableRow>
                          ) : (
                            requests.map((req) => {
                              const a = req.attributes
                              return (
                                <TableRow
                                  key={req.id}
                                  className="cursor-pointer"
                                  onClick={() => openEdit(req)}
                                >
                                  <TableCell className="pl-6 font-mono text-xs">
                                    {a.ref_id ?? "—"}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {a.requester_details?.fullname ?? "—"}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {[
                                      a.requester_details?.phoneCode?.value,
                                      a.requester_details?.phone,
                                    ]
                                      .filter(Boolean)
                                      .join("") || "—"}
                                  </TableCell>
                                  <TableCell className="max-w-40 truncate text-muted-foreground">
                                    {(
                                      a.transfer_details?.from as {
                                        attributes?: { name?: string }
                                      } | null
                                    )?.attributes?.name ?? "—"}
                                  </TableCell>
                                  <TableCell className="max-w-40 truncate text-muted-foreground">
                                    {(
                                      a.transfer_details?.to as {
                                        attributes?: { name?: string }
                                      } | null
                                    )?.attributes?.name ?? "—"}
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground">
                                    {a.transfer_details?.price != null
                                      ? `$${Number(a.transfer_details.price).toFixed(2)}`
                                      : "—"}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {(() => {
                                      const date =
                                        resolveField(
                                          a.pickup_dropoff_details?.pickupDate
                                        ) !== "—"
                                          ? resolveField(
                                              a.pickup_dropoff_details
                                                ?.pickupDate
                                            )
                                          : (a.date ?? "")
                                      const time = resolveField(
                                        a.pickup_dropoff_details?.pickupTime
                                      )
                                      if (!date) return "—"
                                      return time !== "—"
                                        ? formatDateTime(date, time)
                                        : formatDate(date)
                                    })()}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {a.createdAt
                                      ? formatDateTime(a.createdAt)
                                      : "—"}
                                  </TableCell>
                                  <TableCell>
                                    <StatusBadge attrs={a} />
                                  </TableCell>
                                  <TableCell
                                    className="pr-6"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon-sm">
                                          <IconDotsVertical className="size-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent
                                        align="end"
                                        className="w-44"
                                      >
                                        {!a.accepted && (
                                          <DropdownMenuItem
                                            className="whitespace-nowrap"
                                            disabled={!!a.cancelled}
                                            onClick={() =>
                                              updateStatus(
                                                req,
                                                { accepted: true },
                                                "Marked as accepted"
                                              )
                                            }
                                          >
                                            <IconCircleCheck className="size-4" />
                                            Mark as Accepted
                                          </DropdownMenuItem>
                                        )}
                                        {!a.accepted && (
                                          <DropdownMenuSeparator />
                                        )}
                                        {!a.paid ? (
                                          <DropdownMenuItem
                                            className="whitespace-nowrap"
                                            disabled={
                                              !a.accepted || !!a.cancelled
                                            }
                                            onClick={() =>
                                              updateStatus(
                                                req,
                                                { paid: true },
                                                "Marked as paid"
                                              )
                                            }
                                          >
                                            <IconCreditCard className="size-4" />
                                            Mark as Paid
                                          </DropdownMenuItem>
                                        ) : (
                                          <DropdownMenuItem
                                            className="whitespace-nowrap"
                                            disabled={!!a.cancelled}
                                            onClick={() =>
                                              updateStatus(
                                                req,
                                                { paid: false },
                                                "Marked as refunded"
                                              )
                                            }
                                          >
                                            <IconReceiptRefund className="size-4" />
                                            Refund
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        {!a.cancelled ? (
                                          <DropdownMenuItem
                                            className="whitespace-nowrap text-destructive focus:text-destructive"
                                            disabled={!!a.paid}
                                            onClick={() =>
                                              updateStatus(
                                                req,
                                                {
                                                  cancelled: true,
                                                  accepted: false,
                                                  paid: false,
                                                },
                                                "Request cancelled"
                                              )
                                            }
                                          >
                                            <IconCircleX className="size-4" />
                                            Cancel
                                          </DropdownMenuItem>
                                        ) : (
                                          <DropdownMenuItem
                                            className="whitespace-nowrap"
                                            onClick={() =>
                                              updateStatus(
                                                req,
                                                { cancelled: false },
                                                "Cancellation removed"
                                              )
                                            }
                                          >
                                            <IconArrowBackUp className="size-4" />
                                            Uncancel
                                          </DropdownMenuItem>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              )
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex items-center justify-between border-t px-6 py-3">
                      <p className="shrink-0 text-sm whitespace-nowrap text-muted-foreground tabular-nums">
                        Page {page} of {pageCount} &middot; {tabTotal} total
                      </p>
                      <TablePagination
                        page={page}
                        pageCount={pageCount}
                        onPage={setPage}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <RequestSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        request={editingRequest}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
