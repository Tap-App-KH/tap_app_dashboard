"use client"

import * as React from "react"
import { strapiLogin, type AuthResponse } from "@/lib/strapi"

interface AuthUser {
  id: number
  username: string
  email: string
}

interface AuthContextValue {
  user: AuthUser | null
  jwt: string | null
  isAuthenticated: boolean
  login: (identifier: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

const JWT_KEY = "strapi_jwt"
const USER_KEY = "strapi_user"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [jwt, setJwt] = React.useState<string | null>(null)
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    const storedJwt = localStorage.getItem(JWT_KEY)
    const storedUser = localStorage.getItem(USER_KEY)
    if (storedJwt && storedUser) {
      setJwt(storedJwt)
      setUser(JSON.parse(storedUser) as AuthUser)
    }
    setReady(true)
  }, [])

  const login = React.useCallback(
    async (identifier: string, password: string) => {
      const res: AuthResponse = await strapiLogin(identifier, password)
      localStorage.setItem(JWT_KEY, res.jwt)
      localStorage.setItem(USER_KEY, JSON.stringify(res.user))
      setJwt(res.jwt)
      setUser(res.user)
    },
    [],
  )

  const logout = React.useCallback(() => {
    localStorage.removeItem(JWT_KEY)
    localStorage.removeItem(USER_KEY)
    setJwt(null)
    setUser(null)
  }, [])

  if (!ready) return null

  return (
    <AuthContext.Provider
      value={{ user, jwt, isAuthenticated: !!jwt, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider")
  return ctx
}
