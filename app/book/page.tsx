"use client"

import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { strapiPost, type StrapiResponse, type Request } from "@/lib/strapi"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
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
import { IconCircleCheckFilled } from "@tabler/icons-react"
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
  dropoff: z.string().min(1, "Drop off location is required"),
  pickupDate: z.string().min(1, "Pickup date is required"),
  pickupTime: z.string().min(1, "Pickup time is required"),
  hasPet: z.boolean(),
  needsBabySeat: z.boolean(),
  wishes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

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
      <PopoverContent className="w-60 p-0" align="start">
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
                    {value === iso && <IconCheck className="ml-auto shrink-0 size-4" />}
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

export default function BookPage() {
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
    defaultValues: {
      hasPet: false,
      needsBabySeat: false,
      phoneCode: "kh",
      sex: "female" as const,
      nationality: "cambodian" as const,
    },
  })

  const [submittedRefId, setSubmittedRefId] = useState<string | null>(null)

  const sex = watch("sex")
  const nationality = watch("nationality")
  const phoneCode = watch("phoneCode")

  async function onSubmit(values: FormValues) {
    try {
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

      await strapiPost<StrapiResponse<Request>>("/api/requests", {
        data: {
          ref_id: refId,
          date: values.pickupDate,
          accepted: true,
          transfer_details: {},
          requester_details: {
            fullname: values.fullname,
            phoneCode: phoneCodePayload,
            phone: values.phone,
            wishes: values.wishes ?? "",
            sex: values.sex,
            nationality: values.nationality,
            age: values.age,
            email: values.email,
            whatsapp: values.whatsapp,
            telegram: values.telegram,
            hasPet: values.hasPet,
            needsBabySeat: values.needsBabySeat,
          },
          pickup_dropoff_details: {
            pickup: values.pickup,
            dropoff: values.dropoff,
            pickupDate: values.pickupDate,
            pickupTime: values.pickupTime,
          },
        },
      })
      setSubmittedRefId(refId)
      reset()
    } catch (err) {
      toast.error("Failed to submit", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
    }
  }

  if (submittedRefId) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6 md:p-10">
        <div className="flex max-w-md flex-col items-center gap-5 text-center">
          <IconCircleCheckFilled className="size-16 text-green-500" />
          <div>
            <h1 className="text-2xl font-bold">Booking Confirmed!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your transfer request has been received. We&apos;ll be in touch
              shortly to confirm the details.
            </p>
          </div>
          <div className="w-full rounded-lg bg-muted px-5 py-4">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              Booking Reference
            </p>
            <p className="mt-1 font-mono text-lg font-semibold">
              {submittedRefId}
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setSubmittedRefId(null)}
          >
            Make Another Booking
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-background p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-10"
        >
          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold">Book a Transfer</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Fill in your details and we&apos;ll arrange your transfer.
            </p>
          </div>

          {/* Passenger Details */}
          <section className="flex flex-col gap-5">
            <h2 className="text-xl font-bold">Passenger Details</h2>

            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
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
          </section>

          {/* Pickup / Drop off */}
          <section className="flex flex-col gap-5">
            <h2 className="text-xl font-bold">Pickup / Drop off</h2>

            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
              {/* Pickup location */}
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

              {/* Dropoff location */}
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

              {/* Pickup date */}
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

              {/* Pickup time */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pickupTime">
                  Pickup time (Phnom Penh time)
                </Label>
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
          </section>

          {/* Comments / Wishes */}
          <section className="flex flex-col gap-5">
            <h2 className="text-xl font-bold">Comments / Wishes</h2>
            <Textarea
              placeholder="Please share any comments or special wishes here."
              className="resize-none"
              rows={3}
              {...register("wishes")}
            />
          </section>

          <div className="sticky bottom-0 bg-background py-4">
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Submitting…" : "Submit Booking Request"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
