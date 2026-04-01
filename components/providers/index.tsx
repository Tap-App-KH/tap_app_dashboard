"use client"

import * as React from "react"
import { QueryProvider } from "./query-provider"
import { ThemeProvider } from "./theme-provider"
import { AuthProvider } from "./auth-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryProvider>{children}</QueryProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
