"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { ProviderSheet } from "./provider-sheet"
import {
  strapiGet,
  type StrapiResponse,
  type Provider,
  type ContactComponent,
} from "@/lib/strapi"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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
import { IconPlus } from "@tabler/icons-react"

const PAGE_SIZE = 20

function mainContact(contacts: ContactComponent[], type: "phone" | "email") {
  return contacts.find((c) => c.type === type && c.main)?.value ?? "—"
}

function SexBadge({ sex }: { sex: "m" | "f" | null }) {
  if (!sex) return <span className="text-muted-foreground">—</span>
  return (
    <Badge variant="outline" className="text-muted-foreground">
      {sex === "f" ? "Female" : "Male"}
    </Badge>
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

export default function ProvidersPage() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | undefined>()

  function openCreate() {
    setEditingProvider(undefined)
    setSheetOpen(true)
  }

  function openEdit(provider: Provider) {
    setEditingProvider(provider)
    setSheetOpen(true)
  }

  function handleSuccess() {
    queryClient.invalidateQueries({ queryKey: ["providers"] })
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["providers", page],
    queryFn: () =>
      strapiGet<StrapiResponse<Provider[]>>(
        `/api/providers?populate[provider_type][fields][0]=name&populate[contacts]=*&sort=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=${PAGE_SIZE}`,
        auth.jwt ?? undefined
      ),
    enabled: !!auth.jwt,
  })

  const providers = data?.data ?? []
  const pageCount = data?.meta.pagination?.pageCount ?? 1
  const total = data?.meta.pagination?.total ?? 0

  return (
    <div className="flex flex-col gap-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Providers</h1>
        <Button size="sm" onClick={openCreate} className="gap-2">
          <IconPlus className="size-4" />
          New Provider
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isError && (
            <p className="px-6 py-12 text-center text-sm text-destructive">
              {error instanceof Error
                ? error.message
                : "Failed to load providers"}
            </p>
          )}

          {isLoading && (
            <div className="flex flex-col divide-y">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="ml-auto h-4 w-32" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && !isError && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Name</TableHead>
                    <TableHead>Sex</TableHead>
                    <TableHead>Provider Type</TableHead>
                    <TableHead>Main Phone</TableHead>
                    <TableHead className="pr-6">Main Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-12 text-center text-muted-foreground"
                      >
                        No providers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    providers.map((provider) => {
                      const a = provider.attributes
                      return (
                        <TableRow
                          key={provider.id}
                          className="cursor-pointer"
                          onClick={() => openEdit(provider)}
                        >
                          <TableCell className="pl-6 font-medium">
                            {a.fullname ?? "—"}
                          </TableCell>
                          <TableCell>
                            <SexBadge sex={a.sex} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {a.provider_type?.data?.attributes.name ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {mainContact(a.contacts ?? [], "phone")}
                          </TableCell>
                          <TableCell className="pr-6 text-muted-foreground">
                            {mainContact(a.contacts ?? [], "email")}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between border-t px-6 py-3">
                <p className="shrink-0 text-sm whitespace-nowrap text-muted-foreground tabular-nums">
                  Page {page} of {pageCount} &middot; {total} total
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

      <ProviderSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        provider={editingProvider}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
