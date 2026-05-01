/**
 * Tests for the NEXT_PUBLIC_STRAPI_URL environment variable support in strapi.ts.
 *
 * STRAPI_URL is a module-level constant: it is read once when the module is
 * first evaluated.  To test different values we must reset the module registry
 * between each test so each import gets a freshly evaluated constant.
 *
 * Note: lib/strapi.test.ts keeps its own hardcoded STRAPI_URL = "http://localhost:1337"
 * test fixture and must NOT be changed.  This file tests the env-var behavior
 * independently using dynamic re-imports.
 */

import { describe, it, expect, vi, afterEach } from "vitest"

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockFetch(body: unknown, ok = true) {
  const response = {
    ok,
    status: ok ? 200 : 500,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
  return vi.fn().mockResolvedValue(response)
}

// ─── NEXT_PUBLIC_STRAPI_URL ───────────────────────────────────────────────────

describe("NEXT_PUBLIC_STRAPI_URL environment variable", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("uses http://localhost:1337 by default when env var is not set", async () => {
    // Delete the key so the ?? fallback in strapi.ts is triggered
    delete process.env.NEXT_PUBLIC_STRAPI_URL
    vi.resetModules()

    const { strapiGet } = await import("./strapi")
    const payload = { data: [], meta: {} }
    vi.stubGlobal("fetch", mockFetch(payload))

    await strapiGet("/api/requests")

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe("http://localhost:1337/api/requests")
  })

  it("uses NEXT_PUBLIC_STRAPI_URL when the env var is set", async () => {
    const customUrl = "https://strapi.example.com"
    vi.stubEnv("NEXT_PUBLIC_STRAPI_URL", customUrl)
    vi.resetModules()

    const { strapiGet } = await import("./strapi")
    const payload = { data: [], meta: {} }
    vi.stubGlobal("fetch", mockFetch(payload))

    await strapiGet("/api/requests", "test-jwt")

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe(`${customUrl}/api/requests`)
  })

  it("applies the custom base URL to strapiPost as well", async () => {
    const customUrl = "https://staging.api.example.com"
    vi.stubEnv("NEXT_PUBLIC_STRAPI_URL", customUrl)
    vi.resetModules()

    const { strapiPost } = await import("./strapi")
    const payload = { data: { id: 1 }, meta: {} }
    vi.stubGlobal("fetch", mockFetch(payload))

    await strapiPost("/api/requests", { data: {} }, "jwt")

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe(`${customUrl}/api/requests`)
  })

  it("applies the custom base URL to strapiPut as well", async () => {
    const customUrl = "https://prod.api.example.com"
    vi.stubEnv("NEXT_PUBLIC_STRAPI_URL", customUrl)
    vi.resetModules()

    const { strapiPut } = await import("./strapi")
    const payload = { data: { id: 1, attributes: {} }, meta: {} }
    vi.stubGlobal("fetch", mockFetch(payload))

    await strapiPut("/api/requests/1", { data: { accepted: true } }, "jwt")

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe(`${customUrl}/api/requests/1`)
  })

  it("applies the custom base URL to strapiLogin as well", async () => {
    const customUrl = "https://auth.api.example.com"
    vi.stubEnv("NEXT_PUBLIC_STRAPI_URL", customUrl)
    vi.resetModules()

    const { strapiLogin } = await import("./strapi")
    const payload = {
      jwt: "tok",
      user: { id: 1, username: "admin", email: "admin@example.com" },
    }
    vi.stubGlobal("fetch", mockFetch(payload))

    await strapiLogin("admin@example.com", "password")

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe(`${customUrl}/api/auth/local`)
  })

  it("different custom URLs produce different base URLs (isolation check)", async () => {
    const urlA = "https://instance-a.example.com"
    const urlB = "https://instance-b.example.com"

    // First import with urlA
    vi.stubEnv("NEXT_PUBLIC_STRAPI_URL", urlA)
    vi.resetModules()
    const modA = await import("./strapi")
    vi.stubGlobal("fetch", mockFetch({ data: [], meta: {} }))
    await modA.strapiGet("/api/requests")
    const [urlFromA] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(urlFromA).toBe(`${urlA}/api/requests`)

    // Reset and re-import with urlB
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.stubEnv("NEXT_PUBLIC_STRAPI_URL", urlB)
    vi.resetModules()
    const modB = await import("./strapi")
    vi.stubGlobal("fetch", mockFetch({ data: [], meta: {} }))
    await modB.strapiGet("/api/requests")
    const [urlFromB] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(urlFromB).toBe(`${urlB}/api/requests`)
  })
})
