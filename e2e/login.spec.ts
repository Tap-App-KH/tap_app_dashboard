import { test, expect } from "@playwright/test"

const MOCK_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock"
const MOCK_USER = { id: 1, username: "admin", email: "admin@example.com" }

test.describe("Login flow", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the Strapi auth endpoint so no real server is needed
    await page.route("**/api/auth/local", async (route) => {
      const request = route.request()
      const body = JSON.parse(request.postData() ?? "{}")

      if (
        body.identifier === "admin@example.com" &&
        body.password === "password123"
      ) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ jwt: MOCK_JWT, user: MOCK_USER }),
        })
      } else {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            data: null,
            error: {
              status: 400,
              name: "ValidationError",
              message: "Invalid identifier or password",
            },
          }),
        })
      }
    })

    // Mock all Strapi API calls that the dashboard may fire after login
    await page.route("**/api/requests**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [],
          meta: { pagination: { page: 1, pageSize: 20, pageCount: 1, total: 0 } },
        }),
      })
    })
  })

  test("renders the login form with email and password fields", async ({
    page,
  }) => {
    await page.goto("/login")

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(page.getByLabel("Password")).toBeVisible()
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
  })

  test("redirects to /dashboard/requests on successful login", async ({
    page,
  }) => {
    await page.goto("/login")

    await page.getByLabel("Email").fill("admin@example.com")
    await page.getByLabel("Password").fill("password123")
    await page.getByRole("button", { name: "Sign in" }).click()

    await expect(page).toHaveURL(/\/dashboard\/requests/)
  })

  test("shows error message on invalid credentials", async ({ page }) => {
    await page.goto("/login")

    await page.getByLabel("Email").fill("wrong@example.com")
    await page.getByLabel("Password").fill("badpassword")
    await page.getByRole("button", { name: "Sign in" }).click()

    await expect(
      page.getByText("Invalid identifier or password")
    ).toBeVisible()
  })

  test("shows validation errors for empty form submission", async ({ page }) => {
    await page.goto("/login")

    await page.getByRole("button", { name: "Sign in" }).click()

    await expect(page.getByText("Email is required")).toBeVisible()
    await expect(page.getByText("Password is required")).toBeVisible()
  })

  test("shows 'Signing in…' while submitting", async ({ page }) => {
    // Delay the auth response to catch the loading state
    await page.route("**/api/auth/local", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500))
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ jwt: MOCK_JWT, user: MOCK_USER }),
      })
    })

    await page.goto("/login")

    await page.getByLabel("Email").fill("admin@example.com")
    await page.getByLabel("Password").fill("password123")
    await page.getByRole("button", { name: "Sign in" }).click()

    await expect(page.getByRole("button", { name: "Signing in…" })).toBeVisible()
  })
})
