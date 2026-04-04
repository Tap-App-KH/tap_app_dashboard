"use client"

import { useState, useEffect } from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import {
  strapiGet,
  strapiPost,
  strapiPut,
  type Provider,
  type ProviderTypeItem,
  type StrapiResponse,
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
import {
  IconCheck,
  IconChevronDown,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react"

const contactSchema = z.object({
  type: z.enum(["phone", "email"]),
  value: z.string().min(1, "Required"),
  main: z.boolean(),
  verified: z.boolean(),
})

const schema = z.object({
  fullname: z.string().min(1, "Full name is required"),
  sex: z.enum(["f", "m"]),
  providerTypeId: z.string().optional(),
  contacts: z.array(contactSchema),
})

type FormValues = z.infer<typeof schema>

interface ProviderSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider?: Provider
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

function ProviderTypeCombobox({
  value,
  onChange,
  providerTypes,
}: {
  value: string
  onChange: (v: string) => void
  providerTypes: ProviderTypeItem[]
}) {
  const [open, setOpen] = useState(false)
  const selected = providerTypes.find((pt) => String(pt.id) === value)

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
            {selected ? selected.attributes.name : "Select type…"}
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
          <CommandInput placeholder="Search type..." />
          <CommandList>
            <CommandEmpty>No type found.</CommandEmpty>
            <CommandGroup>
              {providerTypes.map((pt) => (
                <CommandItem
                  key={pt.id}
                  value={pt.attributes.name}
                  onSelect={() => {
                    onChange(String(pt.id))
                    setOpen(false)
                  }}
                >
                  <span>{pt.attributes.name}</span>
                  {String(pt.id) === value && (
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

function toFormValues(provider: Provider): FormValues {
  const a = provider.attributes
  return {
    fullname: a.fullname ?? "",
    sex: a.sex ?? "m",
    providerTypeId: a.provider_type?.data
      ? String(a.provider_type.data.id)
      : "",
    contacts: (a.contacts ?? []).map((c) => ({
      type: c.type,
      value: c.value,
      main: c.main,
      verified: c.verified,
    })),
  }
}

const EMPTY_FORM: FormValues = {
  fullname: "",
  sex: "m",
  providerTypeId: "",
  contacts: [],
}

export function ProviderSheet({
  open,
  onOpenChange,
  provider,
  onSuccess,
}: ProviderSheetProps) {
  const auth = useAuth()
  const isEdit = !!provider

  const { data: providerTypesData } = useQuery({
    queryKey: ["provider-types"],
    queryFn: () =>
      strapiGet<StrapiResponse<ProviderTypeItem[]>>(
        "/api/provider-types?fields[0]=name&sort=name:asc",
        auth.jwt ?? undefined
      ),
    staleTime: 5 * 60 * 1000,
  })
  const providerTypes = providerTypesData?.data ?? []

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
    defaultValues: provider ? toFormValues(provider) : EMPTY_FORM,
  })

  const sex = watch("sex")
  const providerTypeId = watch("providerTypeId")

  const { fields, append, remove } = useFieldArray({
    control,
    name: "contacts",
  })

  useEffect(() => {
    if (open) {
      reset(provider ? toFormValues(provider) : EMPTY_FORM)
    }
  }, [open, provider, reset])

  async function onSubmit(values: FormValues) {
    const baseData = {
      fullname: values.fullname,
      sex: values.sex,
      provider_type: values.providerTypeId
        ? Number(values.providerTypeId)
        : null,
      contacts: values.contacts,
    }

    const body = isEdit
      ? { data: baseData }
      : {
          data: {
            ...baseData,
            confirmed: true,
            blocked: false,
            active: true,
            working: true,
            verified: true,
          },
        }

    try {
      if (isEdit) {
        await strapiPut<StrapiResponse<Provider>>(
          `/api/providers/${provider.id}`,
          body,
          auth.jwt!
        )
        toast.success("Provider updated")
      } else {
        await strapiPost<StrapiResponse<Provider>>(
          "/api/providers",
          body,
          auth.jwt ?? undefined
        )
        toast.success("Provider created")
      }
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      toast.error(
        isEdit ? "Failed to update provider" : "Failed to create provider",
        {
          description: err instanceof Error ? err.message : "Please try again.",
        }
      )
    }
  }

  const title = isEdit
    ? `Edit Provider · ${provider.attributes.fullname}`
    : "New Provider"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-lg">
        <SheetHeader className="px-6 py-4">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the provider details below."
              : "Fill in the details to create a new provider."}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <form
          id="provider-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-4"
        >
          {/* Provider Details */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-medium">Provider Details</h3>

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

            <div className="flex flex-col gap-1.5">
              <Label>Sex</Label>
              <ToggleGroup
                value={sex}
                onChange={(v) => setValue("sex", v)}
                options={[
                  { label: "Female", value: "f" },
                  { label: "Male", value: "m" },
                ]}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Provider Type</Label>
              <ProviderTypeCombobox
                value={providerTypeId ?? ""}
                onChange={(v) => setValue("providerTypeId", v)}
                providerTypes={providerTypes}
              />
            </div>
          </div>

          <Separator />

          {/* Contacts */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Contacts</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() =>
                  append({
                    type: "phone",
                    value: "",
                    main: false,
                    verified: false,
                  })
                }
              >
                <IconPlus className="size-3" />
                Add Contact
              </Button>
            </div>

            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No contacts added yet.
              </p>
            )}

            {fields.map((field, index) => {
              const contactType = watch(`contacts.${index}.type`)
              return (
                <div
                  key={field.id}
                  className="flex flex-col gap-2 rounded-lg border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <ToggleGroup
                        value={contactType}
                        onChange={(v) => setValue(`contacts.${index}.type`, v)}
                        options={[
                          { label: "Phone", value: "phone" },
                          { label: "Email", value: "email" },
                        ]}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(index)}
                    >
                      <IconTrash className="size-4" />
                    </Button>
                  </div>

                  <Input
                    placeholder={
                      contactType === "email"
                        ? "email@example.com"
                        : "+1234567890"
                    }
                    {...register(`contacts.${index}.value`)}
                  />
                  {errors.contacts?.[index]?.value && (
                    <p className="text-xs text-destructive">
                      {errors.contacts[index]?.value?.message}
                    </p>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Controller
                        name={`contacts.${index}.main`}
                        control={control}
                        render={({ field: f }) => (
                          <Checkbox
                            id={`contact-main-${index}`}
                            checked={f.value}
                            onCheckedChange={f.onChange}
                          />
                        )}
                      />
                      <Label
                        htmlFor={`contact-main-${index}`}
                        className="cursor-pointer font-normal"
                      >
                        Main
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Controller
                        name={`contacts.${index}.verified`}
                        control={control}
                        render={({ field: f }) => (
                          <Checkbox
                            id={`contact-verified-${index}`}
                            checked={f.value}
                            onCheckedChange={f.onChange}
                          />
                        )}
                      />
                      <Label
                        htmlFor={`contact-verified-${index}`}
                        className="cursor-pointer font-normal"
                      >
                        Verified
                      </Label>
                    </div>
                  </div>
                </div>
              )
            })}
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
          <Button type="submit" form="provider-form" disabled={isSubmitting}>
            {isSubmitting
              ? isEdit
                ? "Saving…"
                : "Creating…"
              : isEdit
                ? "Save changes"
                : "Create provider"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
