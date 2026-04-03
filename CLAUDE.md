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
- [lib/format.ts](lib/format.ts) — Date/time formatting utilities. **Always use these for any date or time display in the UI** to ensure consistency across the project.
  - `formatDate(value)` → `"1 Dec 2024"`
  - `formatDateTime(value, time?)` → `"1 Dec 2024, 02:30 PM"` — accepts an ISO/datetime string or Date, or a date string + separate time string (for form input values).
- [lib/country-codes.ts](lib/country-codes.ts) — `COUNTRY_CODES` array and `flagToIso(flag)` helper. `flagToIso` converts a flag emoji (e.g. `"🇰🇭"`) to its ISO 2-letter country code (`"kh"`). The ISO code is used as the unique identifier for phone country code selection (dial codes like `+1` are shared by multiple countries).
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
- `requester_details` (JSON): `{ fullname, phoneCode, phone, sex, nationality, age, email, whatsapp, telegram, hasPet, needsBabySeat, wishes }`
  - `phoneCode`: `{ flag: string (ISO 2-letter, e.g. "kh"), label: string (e.g. "+855"), value: string (e.g. "+855") }`
  - `phone`: phone number only, without the country code prefix
  - `sex`: `"male" | "female"`
  - `nationality`: `"cambodian" | "non-cambodian"`
- `pickup_dropoff_details` (JSON): `{ pickup, dropoff, pickupTime, pickupDate }`
- `transfer_details` (JSON): `{}` — always included in create/update payloads
- `accepted`, `cancelled`, `paid` (Boolean) — status flags
- `date` (Date) — set to `pickupDate` value on create/update
- `ref_id` (UID) — generated on create as `TT-<10 random hex chars uppercase>`, not regenerated on edit
- `temp_user_id` (Text)
- `createdAt` (ISO datetime string) — set by Strapi, used for "Submitted At" display

**Auth:** `POST /api/auth/local` with `{ identifier, password }` → `{ jwt, user }`. The JWT is stored in `localStorage` via `auth-provider.tsx`.

**Strapi V4 API patterns used:**
- List: `GET /api/requests?populate=*&sort=createdAt:desc&pagination[page]=1&pagination[pageSize]=20`
- Filter: `&filters[accepted][$eq]=true` / `&filters[cancelled][$eq]=true` / `&filters[paid][$eq]=true`
- Count-only: `pagination[pageSize]=1` — reads `meta.pagination.total` without fetching all rows
- Create: `POST /api/requests` with `{ data: { ref_id, date, transfer_details, requester_details, pickup_dropoff_details } }`
- Update: `PUT /api/requests/:id` with `{ data: { date, transfer_details, requester_details, pickup_dropoff_details } }` + Bearer JWT

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
- 4 stat cards (Total Requests, Accepted, Paid, Cancelled) using lightweight count-only queries (`pageSize=1`)
- Tabbed table: **All / Accepted / Paid / Cancelled** — each tab applies a server-side filter
- Server-side pagination, `PAGE_SIZE = 20`
- Table columns: Ref ID, Passenger, Phone (combined `phoneCode.value + phone`), Pickup, Dropoff, **Pickup At** (date + time combined, formatted via `formatDateTime`), **Submitted At** (`createdAt`, formatted via `formatDateTime`), Status
- "New Request" button → opens `RequestSheet` in create mode
- Clicking any table row → opens `RequestSheet` in edit mode
- After save: invalidates `["requests"]` and `["requests-count"]` query keys

`app/dashboard/requests/request-sheet.tsx` — shared create/edit Sheet component. `request` prop undefined = create mode, defined = edit mode.

**Passenger Details fields** (in order): fullname, sex (ToggleGroup: Female/Male), nationality (ToggleGroup: Cambodian/Non-Cambodian), age, phone number (CountryCodeCombobox + number input), email, whatsapp, telegram.

**Pickup & Drop fields** (in order): pickup location, dropoff location, pickupDate, pickupTime, hasPet (checkbox), needsBabySeat (checkbox).

**Comments / Wishes**: Textarea at the bottom.

### Phone country code picker

Both `app/book/page.tsx` and `app/dashboard/requests/request-sheet.tsx` contain a `CountryCodeCombobox` component. Key design decisions:
- The form field `phoneCode` stores the **ISO 2-letter country code** (e.g. `"kh"`, `"us"`) — not the dial code — because multiple countries share the same dial code (e.g. US and Canada both use `+1`).
- `flagToIso(c.flag)` from `lib/country-codes.ts` derives the ISO code from the flag emoji.
- The Strapi payload stores `phoneCode` as `{ flag: "kh", label: "+855", value: "+855" }`.
- On edit, `toFormValues` reads `rd?.phoneCode?.flag ?? "kh"` to restore the correct country.
- In the Sheet context, `PopoverContent` has `onWheel={(e) => e.stopPropagation()}` to prevent Radix Dialog's scroll lock from blocking dropdown scrolling.

### Status badges

`StatusBadge` component in `page.tsx` renders:
- Cancelled → `destructive` badge
- Accepted + Paid → `secondary` badge + green `Paid` badge
- Accepted only → `secondary` badge
- Neither → `outline` / muted `Pending` badge

### Pagination

Default page size for all paginated tables is **20** (`PAGE_SIZE = 20` in `app/dashboard/requests/page.tsx`).

### Toasts

Use `sonner` for notifications (`import { toast } from "sonner"`). The `<Toaster richColors />` is mounted in `app/layout.tsx`.

### Date / time display

**Always use `formatDate` or `formatDateTime` from `lib/format.ts`** for any date or time display in the UI. Never use `toLocaleString` / `toLocaleDateString` inline. This ensures a consistent format (`"1 Dec 2024"` / `"1 Dec 2024, 02:30 PM"`) throughout the project.
