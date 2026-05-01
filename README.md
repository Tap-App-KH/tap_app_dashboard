# Tap App Dashboard

Admin dashboard for managing transport booking requests and service providers, built with Next.js and backed by a Strapi CMS.

## Tech Stack

- **Framework**: Next.js 16 (App Router) with Turbopack
- **UI**: shadcn/ui + Tailwind CSS v4 + Tabler Icons
- **State / Data fetching**: TanStack Query v5
- **Forms**: React Hook Form + Zod
- **Backend**: Strapi V4 at `http://localhost:1337` (configured via `NEXT_PUBLIC_STRAPI_URL`)
- **Tests**: Vitest (unit/integration) + Playwright (E2E)

## Getting Started

### Prerequisites

- Node.js 20+
- A running Strapi V4 instance (see backend repo)

### Setup

```bash
cp .env.example .env.local   # set NEXT_PUBLIC_STRAPI_URL
npm install
npm run dev                  # http://localhost:3000
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_STRAPI_URL` | Strapi backend base URL | `http://localhost:1337` |

## Commands

```bash
npm run dev          # Dev server (Turbopack)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run format       # Prettier (TS/TSX)
npm run typecheck    # TypeScript type-check
npm test             # Unit + integration tests (Vitest)
npm run test:e2e     # E2E tests (Playwright — requires dev server)
```

## Project Structure

```
app/
  login/              # Public login page
  book/               # Public booking form
  dashboard/
    requests/         # Booking requests list, create, edit
    providers/        # Service providers (drivers) list, create, edit
components/
  ui/                 # shadcn/ui components
  providers/          # React context providers (auth, theme)
lib/
  strapi.ts           # Typed Strapi V4 client
  format.ts           # Date/time formatting utilities
  country-codes.ts    # Phone country codes + flag helpers
hooks/
  use-auth.ts         # Auth state and JWT hook
e2e/                  # Playwright E2E tests
```

## Authentication

Login via Strapi local auth (`POST /api/auth/local`). The JWT is stored in `localStorage` and attached as a Bearer token on all API requests.
