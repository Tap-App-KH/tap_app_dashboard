"use client"

import { useState, useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import {
  strapiGet,
  strapiPost,
  strapiPut,
  resolveField,
  type Request,
  type StrapiResponse,
  type PlaceStrapiItem,
  type Provider,
} from "@/lib/strapi"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { COUNTRY_CODES, flagToIso } from "@/lib/country-codes"
import {
  IconBrandTelegram,
  IconBrandWhatsapp,
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconClock,
} from "@tabler/icons-react"

const schema = z.object({
  fullname: z.string().min(1, "Full name is required"),
  sex: z.enum(["male", "female"]).optional(),
  nationality: z.enum(["cambodian", "non-cambodian"]).optional(),
  age: z.string().optional(),
  phoneCode: z.string().min(1),
  phone: z.string().min(1, "Phone is required"),
  email: z.union([z.string().email("Invalid email"), z.literal("")]).optional(),
  whatsapp: z.string().optional(),
  telegram: z.string().optional(),
  pickup: z.string().min(1, "Pickup location is required"),
  dropoff: z.string().min(1, "Dropoff location is required"),
  pickupDate: z.string().min(1, "Pickup date is required"),
  pickupTime: z.string().min(1, "Pickup time is required"),
  hasPet: z.boolean(),
  needsBabySeat: z.boolean(),
  wishes: z.string().optional(),
  costPrice: z.string().optional(),
  price: z.string().min(1, "Selling price is required"),
  transferType: z.enum(["private", "shared"]).optional(),
  fromPlaceId: z.string().optional(),
  toPlaceId: z.string().optional(),
  driverId: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface RequestSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request?: Request
  onSuccess: () => void
}

function ToggleGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T | undefined
  onChange: (v: T) => void
  options: { label: string; value: T }[]
}) {
  return (
    <div className="flex h-9 gap-0.5 rounded-md border bg-muted p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex h-full flex-1 items-center justify-center rounded px-3 text-sm font-medium transition-colors",
            value === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function PlaceCombobox({
  value,
  onChange,
  places,
  placeholder = "Select location…",
}: {
  value: string
  onChange: (v: string) => void
  places: PlaceStrapiItem[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = places.find((p) => String(p.id) === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between font-normal"
        >
          <span className="truncate text-left">
            {selected ? selected.attributes.name : placeholder}
          </span>
          <IconChevronDown className="size-3 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-0"
        align="start"
        onWheel={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput placeholder="Search place..." />
          <CommandList>
            <CommandEmpty>No place found.</CommandEmpty>
            <CommandGroup>
              {places.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.attributes.name}
                  onSelect={() => {
                    onChange(String(p.id))
                    setOpen(false)
                  }}
                >
                  <span>{p.attributes.name}</span>
                  {String(p.id) === value && (
                    <IconCheck className="ml-auto size-4 shrink-0" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function DriverCombobox({
  value,
  onChange,
  drivers,
}: {
  value: string
  onChange: (v: string) => void
  drivers: Provider[]
}) {
  const [open, setOpen] = useState(false)
  const selected = drivers.find((d) => String(d.id) === value)

  function driverLabel(d: Provider) {
    const mainPhone = d.attributes.contacts?.find(
      (c) => c.type === "phone" && c.main
    )?.value
    return mainPhone
      ? `${d.attributes.fullname} - ${mainPhone}`
      : d.attributes.fullname
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between font-normal"
        >
          <span className="truncate text-left">
            {selected ? driverLabel(selected) : "Select driver…"}
          </span>
          <IconChevronDown className="size-3 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-0"
        align="start"
        onWheel={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput placeholder="Search driver..." />
          <CommandList>
            <CommandEmpty>No driver found.</CommandEmpty>
            <CommandGroup>
              {drivers.map((d) => (
                <CommandItem
                  key={d.id}
                  value={driverLabel(d)}
                  onSelect={() => {
                    onChange(String(d.id))
                    setOpen(false)
                  }}
                >
                  <span>{driverLabel(d)}</span>
                  {String(d.id) === value && (
                    <IconCheck className="ml-auto size-4 shrink-0" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function CountryCodeCombobox({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = COUNTRY_CODES.find((c) => flagToIso(c.flag) === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 justify-between gap-1 bg-muted px-3 font-normal whitespace-nowrap"
        >
          {selected ? `${selected.flag} ${selected.code}` : "🇰🇭 +855"}
          <IconChevronDown className="size-3 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-60 p-0"
        align="start"
        onWheel={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {COUNTRY_CODES.map((c) => {
                const iso = flagToIso(c.flag)
                return (
                  <CommandItem
                    key={iso}
                    value={`${c.country} ${c.code}`}
                    onSelect={() => {
                      onChange(iso)
                      setOpen(false)
                    }}
                    className="flex items-center overflow-hidden"
                  >
                    <span className="shrink-0">
                      {c.flag} {c.code}
                    </span>
                    <span className="ml-2 truncate text-xs text-muted-foreground">
                      {c.country}
                    </span>
                    {value === iso && (
                      <IconCheck className="ml-auto size-4 shrink-0" />
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function toFormValues(request: Request): FormValues {
  const a = request.attributes
  const rd = a.requester_details
  return {
    fullname: rd?.fullname ?? "",
    sex: rd?.sex ?? undefined,
    nationality: rd?.nationality ?? undefined,
    age: rd?.age ?? "",
    phoneCode: rd?.phoneCode?.flag ?? "kh",
    phone: rd?.phone ?? "",
    email: rd?.email ?? "",
    whatsapp: rd?.whatsapp ?? "",
    telegram: rd?.telegram ?? "",
    pickup: a.pickup_dropoff_details?.pickup ?? "",
    dropoff: a.pickup_dropoff_details?.dropoff ?? "",
    pickupDate:
      resolveField(a.pickup_dropoff_details?.pickupDate) === "—"
        ? ""
        : resolveField(a.pickup_dropoff_details?.pickupDate),
    pickupTime:
      resolveField(a.pickup_dropoff_details?.pickupTime) === "—"
        ? ""
        : resolveField(a.pickup_dropoff_details?.pickupTime),
    hasPet: rd?.hasPet ?? false,
    needsBabySeat: rd?.needsBabySeat ?? false,
    wishes: rd?.wishes ?? "",
    costPrice:
      a.transfer_details?.costPrice != null
        ? String(a.transfer_details.costPrice)
        : "",
    price:
      a.transfer_details?.price != null ? String(a.transfer_details.price) : "",
    transferType: a.transfer_details?.type ?? undefined,
    fromPlaceId: a.transfer_details?.from
      ? String((a.transfer_details.from as { id: string }).id)
      : "",
    toPlaceId: a.transfer_details?.to
      ? String((a.transfer_details.to as { id: string }).id)
      : "",
    driverId: a.transfer_details?.provider
      ? String(
          (
            a.transfer_details.provider as {
              data: { id: string }
            }
          ).data.id
        )
      : "",
  }
}

const EMPTY_FORM: FormValues = {
  fullname: "",
  sex: "female",
  nationality: "cambodian",
  age: "",
  phoneCode: "kh",
  phone: "",
  email: "",
  whatsapp: "",
  telegram: "",
  pickup: "",
  dropoff: "",
  pickupDate: "",
  pickupTime: "",
  hasPet: false,
  needsBabySeat: false,
  wishes: "",
  costPrice: "",
  price: "",
  transferType: "private",
  fromPlaceId: "",
  toPlaceId: "",
  driverId: "",
}

export function RequestSheet({
  open,
  onOpenChange,
  request,
  onSuccess,
}: RequestSheetProps) {
  const auth = useAuth()
  const isEdit = !!request

  const { data: placesData } = useQuery({
    queryKey: ["places"],
    queryFn: () =>
      strapiGet<StrapiResponse<PlaceStrapiItem[]>>(
        "/api/places?populate[country][fields][0]=name&fields[0]=name&fields[1]=slug&sort=name:asc",
        auth.jwt ?? undefined
      ),
    staleTime: 5 * 60 * 1000,
  })
  const places = placesData?.data ?? []

  const { data: driversData } = useQuery({
    queryKey: ["drivers"],
    queryFn: () =>
      strapiGet<StrapiResponse<Provider[]>>(
        "/api/providers?filters[provider_type][name][$eqi]=driver&populate[contacts]=*&fields[0]=fullname&fields[1]=verified&sort=fullname:asc",
        auth.jwt ?? undefined
      ),
    staleTime: 5 * 60 * 1000,
  })
  const drivers = driversData?.data ?? []

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: request ? toFormValues(request) : EMPTY_FORM,
  })

  const sex = watch("sex")
  const nationality = watch("nationality")
  const phoneCode = watch("phoneCode")
  const transferType = watch("transferType")
  const fromPlaceId = watch("fromPlaceId")
  const toPlaceId = watch("toPlaceId")
  const driverId = watch("driverId")

  useEffect(() => {
    if (open) {
      reset(request ? toFormValues(request) : EMPTY_FORM)
    }
  }, [open, request, reset])

  async function onSubmit(values: FormValues) {
    const refBytes = new Uint8Array(5)
    crypto.getRandomValues(refBytes)
    const refId = `TT-${Array.from(refBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()}`

    const selectedCountry = COUNTRY_CODES.find(
      (c) => flagToIso(c.flag) === values.phoneCode
    )
    const phoneCodePayload = selectedCountry
      ? {
          flag: values.phoneCode,
          label: selectedCountry.code,
          value: selectedCountry.code,
        }
      : undefined

    function buildPlacePayload(placeId: string | undefined) {
      if (!placeId) return null
      const place = places.find((p) => String(p.id) === placeId)
      if (!place) return null
      const countryData = place.attributes.country?.data
      return {
        id: String(place.id),
        __typename: "PlaceEntity",
        attributes: {
          name: place.attributes.name,
          slug: place.attributes.slug,
          __typename: "Place",
          country: {
            __typename: "CountryEntityResponse",
            data: countryData
              ? {
                  id: String(countryData.id),
                  __typename: "CountryEntity",
                  attributes: {
                    name: countryData.attributes.name,
                    __typename: "Country",
                  },
                }
              : null,
          },
        },
      }
    }

    function buildProviderPayload(id: string | undefined) {
      if (!id) return null
      const driver = drivers.find((d) => String(d.id) === id)
      if (!driver) return null
      return {
        data: {
          id: String(driver.id),
          __typename: "ProviderEntity",
          attributes: {
            fullname: driver.attributes.fullname,
            verified: driver.attributes.verified ?? false,
          },
        },
      }
    }

    const body = {
      data: {
        ...(!isEdit && { ref_id: refId, accepted: true }),
        date: values.pickupDate,
        transfer_details: {
          costPrice: values.costPrice ? Number(values.costPrice) : null,
          price: values.price ? Number(values.price) : null,
          type: values.transferType ?? null,
          from: buildPlacePayload(values.fromPlaceId),
          to: buildPlacePayload(values.toPlaceId),
          provider: buildProviderPayload(values.driverId),
        },
        requester_details: {
          fullname: values.fullname,
          sex: values.sex,
          nationality: values.nationality,
          age: values.age,
          phoneCode: phoneCodePayload,
          phone: values.phone,
          email: values.email,
          whatsapp: values.whatsapp,
          telegram: values.telegram,
          hasPet: values.hasPet,
          needsBabySeat: values.needsBabySeat,
          wishes: values.wishes,
        },
        pickup_dropoff_details: {
          pickup: values.pickup,
          dropoff: values.dropoff,
          pickupDate: values.pickupDate,
          pickupTime: values.pickupTime,
        },
      },
    }

    try {
      if (isEdit) {
        await strapiPut<StrapiResponse<Request>>(
          `/api/requests/${request.id}`,
          body,
          auth.jwt!
        )
        toast.success("Request updated")
      } else {
        await strapiPost<StrapiResponse<Request>>(
          "/api/requests",
          body,
          auth.jwt ?? undefined
        )
        toast.success("Request created")
      }
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      toast.error(
        isEdit ? "Failed to update request" : "Failed to create request",
        {
          description: err instanceof Error ? err.message : "Please try again.",
        }
      )
    }
  }

  const title = isEdit
    ? `Edit Request${request.attributes.ref_id ? ` · ${request.attributes.ref_id}` : ""}`
    : "New Request"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-lg">
        <SheetHeader className="px-6 py-4">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the booking details below."
              : "Fill in the details to create a new booking request."}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <form
          id="request-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-4"
        >
          {/* Transfer Details */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-medium">Transfer Details</h3>

            <div className="flex flex-col gap-1.5">
              <Label>From</Label>
              <PlaceCombobox
                value={fromPlaceId ?? ""}
                onChange={(v) => setValue("fromPlaceId", v)}
                places={places}
                placeholder="Select origin…"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>To</Label>
              <PlaceCombobox
                value={toPlaceId ?? ""}
                onChange={(v) => setValue("toPlaceId", v)}
                places={places}
                placeholder="Select destination…"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="costPrice">Cost Price</Label>
                <div className="relative">
                  <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="costPrice"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="pl-6"
                    onKeyDown={(e) => {
                      if (
                        !/[0-9.]|Backspace|Delete|ArrowLeft|ArrowRight|Tab/.test(
                          e.key
                        )
                      )
                        e.preventDefault()
                    }}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value)
                      if (!isNaN(val)) setValue("costPrice", val.toFixed(2))
                    }}
                    {...register("costPrice")}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="price">Selling Price</Label>
                <div className="relative">
                  <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="price"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="pl-6"
                    onKeyDown={(e) => {
                      if (
                        !/[0-9.]|Backspace|Delete|ArrowLeft|ArrowRight|Tab/.test(
                          e.key
                        )
                      )
                        e.preventDefault()
                    }}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value)
                      if (!isNaN(val)) setValue("price", val.toFixed(2))
                    }}
                    {...register("price")}
                  />
                </div>
                {errors.price && (
                  <p className="text-xs text-destructive">
                    {errors.price.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <ToggleGroup
                value={transferType}
                onChange={(v) => setValue("transferType", v)}
                options={[
                  { label: "Private", value: "private" },
                  { label: "Shared", value: "shared" },
                ]}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Driver</Label>
              <DriverCombobox
                value={driverId ?? ""}
                onChange={(v) => setValue("driverId", v)}
                drivers={drivers}
              />
            </div>
          </div>

          <Separator />

          {/* Passenger Details */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-medium">Passenger Details</h3>

            {/* Full name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullname">Full name</Label>
              <Input
                id="fullname"
                placeholder="John Doe"
                {...register("fullname")}
              />
              {errors.fullname && (
                <p className="text-xs text-destructive">
                  {errors.fullname.message}
                </p>
              )}
            </div>

            {/* Sex */}
            <div className="flex flex-col gap-1.5">
              <Label>Sex</Label>
              <ToggleGroup
                value={sex}
                onChange={(v) => setValue("sex", v)}
                options={[
                  { label: "Female", value: "female" },
                  { label: "Male", value: "male" },
                ]}
              />
            </div>

            {/* Nationality */}
            <div className="flex flex-col gap-1.5">
              <Label>Nationality</Label>
              <ToggleGroup
                value={nationality}
                onChange={(v) => setValue("nationality", v)}
                options={[
                  { label: "Cambodian", value: "cambodian" },
                  { label: "Non-Cambodian", value: "non-cambodian" },
                ]}
              />
            </div>

            {/* Age */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                inputMode="numeric"
                maxLength={2}
                placeholder="e.g. 28"
                onKeyDown={(e) => {
                  if (
                    !/[0-9]|Backspace|Delete|ArrowLeft|ArrowRight|Tab/.test(
                      e.key
                    )
                  )
                    e.preventDefault()
                }}
                {...register("age")}
              />
            </div>

            {/* Phone */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <div className="flex gap-2">
                <CountryCodeCombobox
                  value={phoneCode}
                  onChange={(v) => setValue("phoneCode", v)}
                />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="XX XXX XXX"
                  className="flex-1"
                  {...register("phone")}
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-destructive">
                  {errors.phone.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* WhatsApp */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <div className="relative">
                <IconBrandWhatsapp className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="whatsapp"
                  placeholder="+1234567890"
                  className="pl-9"
                  {...register("whatsapp")}
                />
              </div>
            </div>

            {/* Telegram */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="telegram">Telegram</Label>
              <div className="relative">
                <IconBrandTelegram className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="telegram"
                  placeholder="@username"
                  className="pl-9"
                  {...register("telegram")}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Pickup & Drop */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-medium">Pickup / Drop off</h3>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pickup">Pickup location</Label>
              <Input
                id="pickup"
                placeholder="Hotel, address…"
                {...register("pickup")}
              />
              {errors.pickup && (
                <p className="text-xs text-destructive">
                  {errors.pickup.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dropoff">Drop off location</Label>
              <Input
                id="dropoff"
                placeholder="Airport, address…"
                {...register("dropoff")}
              />
              {errors.dropoff && (
                <p className="text-xs text-destructive">
                  {errors.dropoff.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pickupDate">Pickup date</Label>
                <div className="relative">
                  <IconCalendar className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="pickupDate"
                    type="date"
                    className="pl-9"
                    {...register("pickupDate")}
                  />
                </div>
                {errors.pickupDate && (
                  <p className="text-xs text-destructive">
                    {errors.pickupDate.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pickupTime">Pickup time</Label>
                <div className="relative">
                  <IconClock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="pickupTime"
                    type="time"
                    className="pl-9"
                    {...register("pickupTime")}
                  />
                </div>
                {errors.pickupTime && (
                  <p className="text-xs text-destructive">
                    {errors.pickupTime.message}
                  </p>
                )}
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <Controller
                  name="hasPet"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="hasPet"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="hasPet" className="cursor-pointer font-normal">
                  I will be travelling with a pet
                </Label>
              </div>

              <div className="flex items-center gap-2.5">
                <Controller
                  name="needsBabySeat"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="needsBabySeat"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label
                  htmlFor="needsBabySeat"
                  className="cursor-pointer font-normal"
                >
                  I need a baby seat
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Comments / Wishes */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-medium">Comments / Wishes</h3>
            <Textarea
              placeholder="Please share any comments or special wishes here."
              className="resize-none"
              rows={3}
              {...register("wishes")}
            />
          </div>
        </form>

        <Separator />

        <SheetFooter className="flex flex-row justify-end gap-2 px-6 py-4">
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="request-form" disabled={isSubmitting}>
            {isSubmitting
              ? isEdit
                ? "Saving…"
                : "Creating…"
              : isEdit
                ? "Save changes"
                : "Create request"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
