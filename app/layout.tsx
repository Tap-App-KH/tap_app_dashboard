import { Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { Providers } from "@/components/providers"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <body>
        <Providers>
          <TooltipProvider>{children}</TooltipProvider>
        </Providers>
        <Toaster richColors />
      </body>
    </html>
  )
}
