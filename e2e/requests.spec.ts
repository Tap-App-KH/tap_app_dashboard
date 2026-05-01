import { test, expect, type Page } from "@playwright/test"

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const MOCK_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock"
const MOCK_USER = { id: 1, username: "admin", email: "admin@example.com" }

const MOCK_REQUESTS = [
  {
    id: 1,
    attributes: {
      ref_id: "TT-AABBCCDD01",
      accepted: false,
      cancelled: false,
      paid: false,
      date: "2025-06-15",
      temp_user_id: null,
      createdAt: "2025-06-01T10:00:00.000Z",
      updatedAt: "2025-06-01T10:00:00.000Z",
      requester_details: {
        fullname: "Alice Wonderland",
        phone: "12345678",
        phoneCode: { flag: "kh", label: "+855", value: "+855" },
        sex: "female",
        nationality: "cambodian",
        age: "28",
        email: "alice@example.com",
        whatsapp: null,
        telegram: null,
        hasPet: false,
        needsBabySeat: false,
        wishes: "",
      },
      pickup_dropoff_details: {
        pickup: "Phnom Penh Airport",
        dropoff: "Siem Reap Grand Hotel",
        pickupTime: "09:00",
        pickupDate: "2025-06-15",
      },
      transfer_details: {
        costPrice: 40,
        price: 55,
        type: "private",
        from: {
          id: "1",
          attributes: { name: "Phnom Penh", slug: "phnom-penh" },
        },
        to: { id: "2", attributes: { name: "Siem Reap", slug: "siem-reap" } },
        provider: null,
      },
    },
  },
  {
    id: 2,
    attributes: {
      ref_id: "TT-AABBCCDD02",
      accepted: true,
      cancelled: false,
      paid: false,
      date: "2025-06-20",
      temp_user_id: null,
      createdAt: "2025-06-02T08:30:00.000Z",
      updatedAt: "2025-06-02T08:30:00.000Z",
      requester_details: {
        fullname: "Bob Builder",
        phone: "87654321",
        phoneCode: { flag: "kh", label: "+855", value: "+855" },
        sex: "male",
        nationality: "non-cambodian",
        age: "35",
        email: "bob@example.com",
        whatsapp: "+85587654321",
        telegram: null,
        hasPet: false,
        needsBabySeat: true,
        wishes: "Need extra luggage space",
      },
      pickup_dropoff_details: {
        pickup: "Raffles Hotel",
        dropoff: "Phnom Penh International Airport",
        pickupTime: "14:30",
        pickupDate: "2025-06-20",
      },
      transfer_details: {
        costPrice: 30,
        price: 45,
        type: "shared",
        from: { id: "2", attributes: { name: "Siem Reap", slug: "siem-reap" } },
        to: { id: "1", attributes: { name: "Phnom Penh", slug: "phnom-penh" } },
        provider: null,
      },
    },
  },
]

/** Seeds localStorage with auth credentials so the app treats us as logged in. */
async function seedAuth(page: Page) {
  await page.goto("/")
  await page.evaluate(
    ({ jwt, user }) => {
      localStorage.setItem("strapi_jwt", jwt)
      localStorage.setItem("strapi_user", JSON.stringify(user))
    },
    { jwt: MOCK_JWT, user: MOCK_USER }
  )
}

/** Builds a paginated Strapi response. */
function strapiList(data: unknown[], total: number) {
  return JSON.stringify({
    data,
    meta: {
      pagination: {
        page: 1,
        pageSize: 20,
        pageCount: Math.ceil(total / 20),
        total,
      },
    },
  })
}

/** Builds a count-only Strapi response (pageSize=1, real total in meta). */
function strapiCount(total: number) {
  return JSON.stringify({
    data: [],
    meta: {
      pagination: { page: 1, pageSize: 1, pageCount: 1, total },
    },
  })
}

// ─── Mock helpers ─────────────────────────────────────────────────────────────

async function mockRequestsApi(page: Page) {
  await page.route("**/api/requests**", async (route) => {
    const url = route.request().url()

    // Count queries (pageSize=1) used by stat cards
    if (url.includes("pageSize=1")) {
      if (url.includes("filters[accepted][$eq]=true")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: strapiCount(3),
        })
      } else if (url.includes("filters[paid][$eq]=true")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: strapiCount(2),
        })
      } else if (url.includes("filters[cancelled][$eq]=true")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: strapiCount(1),
        })
      } else {
        // Total count (all statuses)
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: strapiCount(5),
        })
      }
      return
    }

    // Main paginated list query (populate=*)
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: strapiList(MOCK_REQUESTS, 2),
    })
  })
}

async function mockPlacesAndDriversApi(page: Page) {
  await page.route("**/api/places**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], meta: {} }),
    })
  })

  await page.route("**/api/providers**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], meta: {} }),
    })
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Requests page", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page)
    await mockRequestsApi(page)
    await mockPlacesAndDriversApi(page)
  })

  test("renders stat cards with correct titles", async ({ page }) => {
    await page.goto("/dashboard/requests")

    await expect(page.getByText("Total Requests")).toBeVisible()
    await expect(page.getByText("Accepted")).toBeVisible()
    await expect(page.getByText("Paid")).toBeVisible()
    await expect(page.getByText("Cancelled")).toBeVisible()
  })

  test("displays stat card counts from API", async ({ page }) => {
    await page.goto("/dashboard/requests")

    // Wait for the stat cards to load (skeletons to disappear)
    await expect(page.getByText("All booking requests")).toBeVisible()

    // Total = 5, Accepted = 3, Paid = 2, Cancelled = 1
    // The counts appear as large numbers in the stat cards
    const statSection = page.locator(".grid").first()
    await expect(statSection.getByText("5")).toBeVisible()
    await expect(statSection.getByText("3")).toBeVisible()
    await expect(statSection.getByText("2")).toBeVisible()
    await expect(statSection.getByText("1")).toBeVisible()
  })

  test("renders All, Accepted, Paid, Cancelled tabs", async ({ page }) => {
    await page.goto("/dashboard/requests")

    await expect(page.getByRole("tab", { name: /All/ })).toBeVisible()
    await expect(page.getByRole("tab", { name: /Accepted/ })).toBeVisible()
    await expect(page.getByRole("tab", { name: /Paid/ })).toBeVisible()
    await expect(page.getByRole("tab", { name: /Cancelled/ })).toBeVisible()
  })

  test("shows mocked request ref_ids in the table", async ({ page }) => {
    await page.goto("/dashboard/requests")

    await expect(page.getByText("TT-AABBCCDD01")).toBeVisible()
    await expect(page.getByText("TT-AABBCCDD02")).toBeVisible()
  })

  test("shows passenger names in the table", async ({ page }) => {
    await page.goto("/dashboard/requests")

    await expect(page.getByText("Alice Wonderland")).toBeVisible()
    await expect(page.getByText("Bob Builder")).toBeVisible()
  })

  test("New Request button is visible", async ({ page }) => {
    await page.goto("/dashboard/requests")

    await expect(
      page.getByRole("button", { name: "New Request" })
    ).toBeVisible()
  })

  test("Copy booking URL button is visible", async ({ page }) => {
    await page.goto("/dashboard/requests")

    await expect(
      page.getByRole("button", { name: "Copy booking URL" })
    ).toBeVisible()
  })
})

test.describe("Status update", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page)
    await mockRequestsApi(page)
    await mockPlacesAndDriversApi(page)
  })

  test("shows 'Marked as accepted' toast when clicking Mark as Accepted", async ({
    page,
  }) => {
    // Mock the PUT endpoint for the first request (id=1, which is not accepted)
    await page.route("**/api/requests/1", async (route) => {
      if (route.request().method() === "PUT") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              id: 1,
              attributes: { ...MOCK_REQUESTS[0].attributes, accepted: true },
            },
            meta: {},
          }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto("/dashboard/requests")

    // Wait for the table to load
    await expect(page.getByText("TT-AABBCCDD01")).toBeVisible()

    // The first request row has id=1 (not accepted), open its dropdown menu.
    // Each row has a dropdown trigger button (the three-dot icon button).
    // We use the first row's action cell.
    const firstRowMenu = page
      .getByRole("row")
      .filter({ hasText: "TT-AABBCCDD01" })
      .getByRole("button")
      .last()

    await firstRowMenu.click()

    // Click "Mark as Accepted" in the dropdown
    await page.getByRole("menuitem", { name: "Mark as Accepted" }).click()

    // Assert toast appears
    await expect(page.getByText("Marked as accepted")).toBeVisible()
  })

  test("shows 'Marked as paid' toast when clicking Mark as Paid on accepted request", async ({
    page,
  }) => {
    // Request id=2 is already accepted, so "Mark as Paid" should be enabled
    await page.route("**/api/requests/2", async (route) => {
      if (route.request().method() === "PUT") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              id: 2,
              attributes: { ...MOCK_REQUESTS[1].attributes, paid: true },
            },
            meta: {},
          }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto("/dashboard/requests")

    await expect(page.getByText("TT-AABBCCDD02")).toBeVisible()

    const secondRowMenu = page
      .getByRole("row")
      .filter({ hasText: "TT-AABBCCDD02" })
      .getByRole("button")
      .last()

    await secondRowMenu.click()

    await page.getByRole("menuitem", { name: "Mark as Paid" }).click()

    await expect(page.getByText("Marked as paid")).toBeVisible()
  })

  test("shows 'Request cancelled' toast when cancelling a request", async ({
    page,
  }) => {
    // Request id=1 is not paid, so Cancel should be available
    await page.route("**/api/requests/1", async (route) => {
      if (route.request().method() === "PUT") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              id: 1,
              attributes: {
                ...MOCK_REQUESTS[0].attributes,
                cancelled: true,
                accepted: false,
                paid: false,
              },
            },
            meta: {},
          }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto("/dashboard/requests")

    await expect(page.getByText("TT-AABBCCDD01")).toBeVisible()

    const firstRowMenu = page
      .getByRole("row")
      .filter({ hasText: "TT-AABBCCDD01" })
      .getByRole("button")
      .last()

    await firstRowMenu.click()

    await page.getByRole("menuitem", { name: "Cancel" }).click()

    await expect(page.getByText("Request cancelled")).toBeVisible()
  })

  test("shows error toast when PUT request fails", async ({ page }) => {
    await page.route("**/api/requests/1", async (route) => {
      if (route.request().method() === "PUT") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            data: null,
            error: {
              status: 500,
              name: "InternalServerError",
              message: "Something went wrong",
            },
          }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto("/dashboard/requests")

    await expect(page.getByText("TT-AABBCCDD01")).toBeVisible()

    const firstRowMenu = page
      .getByRole("row")
      .filter({ hasText: "TT-AABBCCDD01" })
      .getByRole("button")
      .last()

    await firstRowMenu.click()

    await page.getByRole("menuitem", { name: "Mark as Accepted" }).click()

    await expect(page.getByText(/Failed:/)).toBeVisible()
  })
})
