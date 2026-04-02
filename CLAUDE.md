# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run lint         # Run ESLint
npm run format       # Prettier format all TS/TSX files
npm run typecheck    # Type-check without emitting
```

No test infrastructure is currently configured.

## Architecture

**Next.js App Router** project using React Server Components (RSC) by default. Only components that need browser APIs or React state/effects are marked `"use client"`.

### Key directories

- [app/](app/) — Routes and layouts. `layout.tsx` is the root shell; `page.tsx` is `/`. Add new routes as `app/<route>/page.tsx`.
- [components/ui/](components/ui/) — shadcn/ui components (copy-paste library built on Radix UI + CVA). Add new ones via `npx shadcn@latest add <component>`. **Always prefer shadcn/ui components over custom or native HTML elements where a suitable component exists.**
- [components/providers/](components/providers/) — All React context providers. `index.tsx` exports `<Providers>` which is the single wrapper used in the root layout. Add new providers here and compose them in `index.tsx`.
  - `theme-provider.tsx` — wraps next-themes; press `d` in the browser to toggle light/dark.
  - `query-provider.tsx` — wraps TanStack Query (`@tanstack/react-query`). The `QueryClient` is a singleton in the browser (shared across renders) but freshly created on the server per request. Default `staleTime` is 60 seconds.
  - `auth-provider.tsx` — stores Strapi JWT + user in `localStorage`. Exposes `login()`, `logout()`, `isAuthenticated`, `jwt`, `user`. Renders `null` until hydrated from storage.
- [lib/utils.ts](lib/utils.ts) — Exports `cn()`, the standard helper for merging Tailwind classes (`clsx` + `tailwind-merge`).
- [lib/strapi.ts](lib/strapi.ts) — Typed Strapi V4 fetch client. Key exports: `strapiLogin`, `strapiGet`, `strapiPost` (optional JWT), `strapiPut` (requires JWT). Base URL is `http://localhost:1337`. Also exports TypeScript interfaces: `Request`, `RequestAttributes`, `RequesterDetails`, `PickupDropoffDetails`, `LabelValue`, `StrapiResponse`, `AuthResponse`. Use `resolveField()` to safely unwrap `pickupDate`/`pickupTime` which may be a plain string or `{ label, value }` object.
- [hooks/use-auth.ts](hooks/use-auth.ts) — Re-exports `useAuth()` from `auth-provider`. Use this in any component that needs auth state or login/logout.

### Styling

Tailwind CSS v4 via PostCSS (`@import "tailwindcss"` syntax). Design tokens are CSS variables in oklch color space defined in [app/globals.css](app/globals.css). Dark mode uses the `.dark` class. Prettier auto-sorts Tailwind classes on save (via `prettier-plugin-tailwindcss`).

### Icon library

Use `@tabler/icons-react` — configured in [components.json](components.json) as the shadcn icon source.

### Data fetching

TanStack Query (`useQuery`, `useMutation`, etc.) is the standard for client-side data fetching. The `QueryClient` is provided globally via `<QueryProvider>` in `components/providers/`.

### Path aliases

`@/*` maps to the repo root, so imports look like `@/components/ui/button`, `@/lib/utils`, etc.

### Strapi backend

Strapi V4 runs locally at `http://localhost:1337`. Content type: `api::request.request`.

**Request field shapes:**
- `requester_details` (JSON): `{ fullname, phone, wishes }`
- `pickup_dropoff_details` (JSON): `{ pickup, dropoff, pickupTime, pickupDate }`
- `accepted`, `cancelled`, `paid` (Boolean) — status flags
- `date` (Date), `ref_id` (UID), `temp_user_id` (Text)

**Auth:** `POST /api/auth/local` with `{ identifier, password }` → `{ jwt, user }`. The JWT is stored in `localStorage` via `auth-provider.tsx`.

**Strapi V4 API patterns used:**
- List: `GET /api/requests?populate=*&sort=createdAt:desc&pagination[page]=1&pagination[pageSize]=20`
- Filter: `&filters[accepted][$eq]=true` / `&filters[accepted][$ne]=true`
- Count-only: `pagination[pageSize]=1` — reads `meta.pagination.total` without fetching all rows
- Create: `POST /api/requests` with `{ data: { ... } }`
- Update: `PUT /api/requests/:id` with `{ data: { ... } }` + Bearer JWT

### Routes

| Route | Access | Purpose |
|---|---|---|
| `/` | any | Redirects to `/dashboard/requests` or `/login` |
| `/login` | public | Strapi login form |
| `/book` | public | Booking request submission form |
| `/dashboard/requests` | protected | Lists, creates, and edits booking requests |

The dashboard layout (`app/dashboard/layout.tsx`) guards all `/dashboard/*` routes — it redirects to `/login` if no JWT is present.

### Dashboard — Requests page

`app/dashboard/requests/page.tsx` — main list view. Features:
- 4 stat cards (Total, Accepted, Cancelled, Paid) using lightweight count-only queries (`pageSize=1`)
- Tabbed table: All / Pending / Accepted / Cancelled — each tab applies a server-side filter
- Server-side pagination, `PAGE_SIZE = 20`
- "New Request" button → opens `RequestSheet` in create mode
- Clicking any table row → opens `RequestSheet` in edit mode
- After save: invalidates `["requests"]` and `["requests-count"]` query keys

`app/dashboard/requests/request-sheet.tsx` — shared create/edit Sheet component. `request` prop undefined = create mode, defined = edit mode. Fields: fullname, phone, wishes, pickup, dropoff, pickupDate, pickupTime.

### Pagination

Default page size for all paginated tables is **20** (`PAGE_SIZE = 20` in `app/dashboard/requests/page.tsx`).

### Toasts

Use `sonner` for notifications (`import { toast } from "sonner"`). The `<Toaster richColors />` is mounted in `app/layout.tsx`.
