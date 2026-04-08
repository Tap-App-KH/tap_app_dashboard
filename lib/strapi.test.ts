import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  strapiLogin,
  strapiGet,
  strapiPost,
  strapiPut,
  resolveField,
  type AuthResponse,
  type StrapiResponse,
  type Request,
} from "./strapi"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockFetch(body: unknown, ok = true, status = 200) {
  const response = {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
  return vi.fn().mockResolvedValue(response)
}

const STRAPI_URL = "http://localhost:1337"

// ─── resolveField ─────────────────────────────────────────────────────────────

describe("resolveField", () => {
  it("returns em dash for null", () => {
    expect(resolveField(null)).toBe("—")
  })

  it("returns em dash for undefined", () => {
    expect(resolveField(undefined)).toBe("—")
  })

  it("returns em dash for empty string", () => {
    expect(resolveField("")).toBe("—")
  })

  it("returns the plain string as-is", () => {
    expect(resolveField("hello")).toBe("hello")
  })

  it("returns value when value is non-empty", () => {
    expect(resolveField({ value: "x", label: "y" })).toBe("x")
  })

  it("falls back to label when value is empty and label is non-empty", () => {
    expect(resolveField({ value: "", label: "y" })).toBe("y")
  })

  it("returns em dash when both value and label are empty", () => {
    expect(resolveField({ value: "", label: "" })).toBe("—")
  })
})

// ─── strapiLogin ──────────────────────────────────────────────────────────────

describe("strapiLogin", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("POSTs to /api/auth/local and returns { jwt, user } on success", async () => {
    const payload: AuthResponse = {
      jwt: "test-jwt-token",
      user: { id: 1, username: "admin", email: "admin@example.com" },
    }
    vi.stubGlobal("fetch", mockFetch(payload))

    const result = await strapiLogin("admin@example.com", "password123")

    expect(result).toEqual(payload)
    expect(global.fetch).toHaveBeenCalledOnce()

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe(`${STRAPI_URL}/api/auth/local`)
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body)).toEqual({
      identifier: "admin@example.com",
      password: "password123",
    })
    expect(init.headers["Content-Type"]).toBe("application/json")
  })

  it("throws an error with Strapi error message when response is not ok", async () => {
    const errorBody = {
      data: null,
      error: { status: 400, name: "ValidationError", message: "Invalid credentials" },
    }
    vi.stubGlobal("fetch", mockFetch(errorBody, false, 400))

    await expect(strapiLogin("bad@example.com", "wrong")).rejects.toThrow(
      "Invalid credentials"
    )
  })

  it("falls back to HTTP status message when error has no message", async () => {
    const errorBody = { data: null, error: { status: 500, name: "InternalError" } }
    vi.stubGlobal("fetch", mockFetch(errorBody, false, 500))

    await expect(strapiLogin("a@b.com", "pw")).rejects.toThrow("HTTP 500")
  })
})

// ─── strapiGet ────────────────────────────────────────────────────────────────

describe("strapiGet", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("GETs the correct URL and includes Authorization header when jwt is provided", async () => {
    const payload = { data: [], meta: {} }
    vi.stubGlobal("fetch", mockFetch(payload))

    await strapiGet<typeof payload>("/api/requests", "my-jwt")

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe(`${STRAPI_URL}/api/requests`)
    expect(init.headers["Authorization"]).toBe("Bearer my-jwt")
    expect(init.headers["Content-Type"]).toBe("application/json")
  })

  it("does not include Authorization header when jwt is omitted", async () => {
    const payload = { data: [], meta: {} }
    vi.stubGlobal("fetch", mockFetch(payload))

    await strapiGet<typeof payload>("/api/requests")

    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(init.headers).not.toHaveProperty("Authorization")
  })

  it("returns the parsed response body on success", async () => {
    const payload = { data: [{ id: 1 }], meta: { pagination: { total: 1 } } }
    vi.stubGlobal("fetch", mockFetch(payload))

    const result = await strapiGet<typeof payload>("/api/requests", "jwt")
    expect(result).toEqual(payload)
  })

  it("throws on error response", async () => {
    const errorBody = {
      data: null,
      error: { status: 401, name: "UnauthorizedError", message: "Missing or invalid credentials" },
    }
    vi.stubGlobal("fetch", mockFetch(errorBody, false, 401))

    await expect(strapiGet("/api/requests", "bad-jwt")).rejects.toThrow(
      "Missing or invalid credentials"
    )
  })
})

// ─── strapiPost ───────────────────────────────────────────────────────────────

describe("strapiPost", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("POSTs with serialized JSON body and Content-Type header", async () => {
    const requestBody = { data: { fullname: "John Doe" } }
    const responsePayload = { data: { id: 42 }, meta: {} }
    vi.stubGlobal("fetch", mockFetch(responsePayload))

    await strapiPost<typeof responsePayload>("/api/requests", requestBody, "jwt-token")

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe(`${STRAPI_URL}/api/requests`)
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body)).toEqual(requestBody)
    expect(init.headers["Content-Type"]).toBe("application/json")
    expect(init.headers["Authorization"]).toBe("Bearer jwt-token")
  })

  it("does not include Authorization header when jwt is omitted", async () => {
    vi.stubGlobal("fetch", mockFetch({ data: null, meta: {} }))

    await strapiPost("/api/requests", { data: {} })

    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(init.headers).not.toHaveProperty("Authorization")
  })

  it("throws on error response", async () => {
    const errorBody = {
      data: null,
      error: { status: 422, name: "ValidationError", message: "Invalid data" },
    }
    vi.stubGlobal("fetch", mockFetch(errorBody, false, 422))

    await expect(strapiPost("/api/requests", {}, "jwt")).rejects.toThrow("Invalid data")
  })
})

// ─── strapiPut ────────────────────────────────────────────────────────────────

describe("strapiPut", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("PUTs with the correct URL, JWT, and body", async () => {
    const patchBody = { data: { accepted: true } }
    const responsePayload = { data: { id: 10, attributes: { accepted: true } }, meta: {} }
    vi.stubGlobal("fetch", mockFetch(responsePayload))

    const result = await strapiPut<typeof responsePayload>(
      "/api/requests/10",
      patchBody,
      "required-jwt"
    )

    expect(result).toEqual(responsePayload)

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe(`${STRAPI_URL}/api/requests/10`)
    expect(init.method).toBe("PUT")
    expect(JSON.parse(init.body)).toEqual(patchBody)
    expect(init.headers["Authorization"]).toBe("Bearer required-jwt")
    expect(init.headers["Content-Type"]).toBe("application/json")
  })

  it("throws on error response", async () => {
    const errorBody = {
      data: null,
      error: { status: 404, name: "NotFoundError", message: "Request not found" },
    }
    vi.stubGlobal("fetch", mockFetch(errorBody, false, 404))

    await expect(strapiPut("/api/requests/999", {}, "jwt")).rejects.toThrow(
      "Request not found"
    )
  })
})
