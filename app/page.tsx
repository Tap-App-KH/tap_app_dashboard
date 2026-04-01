"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

export default function Page() {
  const auth = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (auth.isAuthenticated) {
      router.replace("/dashboard/requests")
    } else {
      router.replace("/login")
    }
  }, [auth.isAuthenticated, router])

  return null
}
