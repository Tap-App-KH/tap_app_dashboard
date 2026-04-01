"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { strapiPost, type StrapiResponse, type Request } from "@/lib/strapi"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

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

export default function BookPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    try {
      await strapiPost<StrapiResponse<Request>>("/api/requests", {
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
      })
      toast.success("Booking request submitted!", {
        description: "We'll be in touch shortly.",
      })
      reset()
    } catch (err) {
      toast.error("Failed to submit", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Book a Transfer</CardTitle>
          <CardDescription>
            Fill in your details and we&apos;ll arrange your transfer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            {/* Passenger Details */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">Passenger Details</h3>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fullname">Full Name</Label>
                <Input id="fullname" placeholder="John Doe" {...register("fullname")} />
                {errors.fullname && (
                  <p className="text-destructive text-xs">{errors.fullname.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" placeholder="+1 555 000 0000" {...register("phone")} />
                {errors.phone && (
                  <p className="text-destructive text-xs">{errors.phone.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wishes">Notes / Wishes</Label>
                <Input id="wishes" placeholder="Any special requests…" {...register("wishes")} />
              </div>
            </div>

            {/* Pickup & Drop */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">Pickup & Drop</h3>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pickup">Pickup Location</Label>
                <Input id="pickup" placeholder="Hotel, address…" {...register("pickup")} />
                {errors.pickup && (
                  <p className="text-destructive text-xs">{errors.pickup.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dropoff">Dropoff Location</Label>
                <Input id="dropoff" placeholder="Airport, address…" {...register("dropoff")} />
                {errors.dropoff && (
                  <p className="text-destructive text-xs">{errors.dropoff.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pickupDate">Pickup Date</Label>
                  <Input id="pickupDate" type="date" {...register("pickupDate")} />
                  {errors.pickupDate && (
                    <p className="text-destructive text-xs">{errors.pickupDate.message}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pickupTime">Pickup Time</Label>
                  <Input id="pickupTime" type="time" {...register("pickupTime")} />
                  {errors.pickupTime && (
                    <p className="text-destructive text-xs">{errors.pickupTime.message}</p>
                  )}
                </div>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Submitting…" : "Submit Booking Request"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
