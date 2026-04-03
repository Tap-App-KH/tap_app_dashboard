"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import {
  strapiPost,
  strapiPut,
  resolveField,
  type Request,
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

const schema = z.object({
  fullname: z.string().min(1, "Full name is required"),
  phone: z.string().min(1, "Phone is required"),
  wishes: z.string(),
  pickup: z.string().min(1, "Pickup location is required"),
  dropoff: z.string().min(1, "Dropoff location is required"),
  pickupDate: z.string().min(1, "Pickup date is required"),
  pickupTime: z.string().min(1, "Pickup time is required"),
})

type FormValues = z.infer<typeof schema>

interface RequestSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request?: Request
  onSuccess: () => void
}

function toFormValues(request: Request): FormValues {
  const a = request.attributes
  return {
    fullname: a.requester_details?.fullname ?? "",
    phone: a.requester_details?.phone ?? "",
    wishes: a.requester_details?.wishes ?? "",
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
  }
}

export function RequestSheet({
  open,
  onOpenChange,
  request,
  onSuccess,
}: RequestSheetProps) {
  const auth = useAuth()
  const isEdit = !!request

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: request ? toFormValues(request) : undefined,
  })

  // Re-populate form when switching between requests or create mode
  useEffect(() => {
    if (open) {
      reset(
        request
          ? toFormValues(request)
          : {
              fullname: "",
              phone: "",
              wishes: "",
              pickup: "",
              dropoff: "",
              pickupDate: "",
              pickupTime: "",
            }
      )
    }
  }, [open, request, reset])

  async function onSubmit(values: FormValues) {
    const body = {
      data: {
        requester_details: {
          fullname: values.fullname,
          phone: values.phone,
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
          {/* Passenger Details */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-medium">Passenger Details</h3>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullname">Full Name</Label>
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
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 555 000 0000"
                {...register("phone")}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wishes">Notes / Wishes</Label>
              <Input
                id="wishes"
                placeholder="Any special requests…"
                {...register("wishes")}
              />
            </div>
          </div>

          <Separator />

          {/* Pickup & Drop */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-medium">Pickup & Drop</h3>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pickup">Pickup Location</Label>
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
              <Label htmlFor="dropoff">Dropoff Location</Label>
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
                <Label htmlFor="pickupDate">Pickup Date</Label>
                <Input
                  id="pickupDate"
                  type="date"
                  {...register("pickupDate")}
                />
                {errors.pickupDate && (
                  <p className="text-xs text-destructive">
                    {errors.pickupDate.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pickupTime">Pickup Time</Label>
                <Input
                  id="pickupTime"
                  type="time"
                  {...register("pickupTime")}
                />
                {errors.pickupTime && (
                  <p className="text-xs text-destructive">
                    {errors.pickupTime.message}
                  </p>
                )}
              </div>
            </div>
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
