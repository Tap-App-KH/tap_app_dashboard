# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Commands

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run lint         # Run ESLint
npm run format       # Prettier format all TS/TSX files
npm run typecheck    # Type-check without emitting
```

npm test              # Unit + integration tests (Vitest)
npm run test:e2e      # E2E tests via Playwright (requires dev server)

## Architecture

**Next.js App Router** — React Server Components by default. Mark `"use client"` only for browser APIs or React state/effects.

**Always prefer shadcn/ui components** (`components/ui/`) over custom or native HTML. Add new ones via `npx shadcn@latest add <component>`.

### Key files

- `lib/strapi.ts` — Typed Strapi V4 client (`strapiGet`, `strapiPost`, `strapiPut`). Use `resolveField()` to unwrap `pickupDate`/`pickupTime` which may be a plain string or `{ label, value }`.
- `lib/format.ts` — **Always use `formatDate`/`formatDateTime` for all date/time display.** Never use `toLocaleString` inline.
- `lib/country-codes.ts` — `COUNTRY_CODES` + `flagToIso(flag)` converts flag emoji → ISO 2-letter code.
- `hooks/use-auth.ts` — `useAuth()` for auth state and JWT.
- `@tabler/icons-react` — icon library (configured in `components.json`).

### Strapi backend

Strapi V4 at `http://localhost:1337`. Auth: `POST /api/auth/local` → `{ jwt, user }`.

**Request field shapes:**
- `requester_details`: `{ fullname, phoneCode, phone, sex, nationality, age, email, whatsapp, telegram, hasPet, needsBabySeat, wishes }`
  - `phoneCode`: `{ flag: "kh", label: "+855", value: "+855" }` — `flag` is ISO 2-letter code
  - `sex`: `"male" | "female"`; `nationality`: `"cambodian" | "non-cambodian"`
- `pickup_dropoff_details`: `{ pickup, dropoff, pickupTime, pickupDate }`
- `transfer_details`: `{ costPrice, price, type, from, to, provider }` — always include in payloads
- `date` (Date) — authoritative pickup date; on edit, read from `a.date` not `pickup_dropoff_details.pickupDate`
- `ref_id` — `TT-<10 random hex uppercase>`, generated on create only

**Provider `sex` enum**: `"f"` / `"m"` — not `"female"` / `"male"`.

**Key API patterns:**
- List requests: `GET /api/requests?populate=*&sort=createdAt:desc&pagination[page]=1&pagination[pageSize]=20`
- Filter by status: `&filters[accepted][$eq]=true`
- Filter by date: `&filters[date][$gte]=YYYY-MM-DD&filters[date][$lte]=YYYY-MM-DD`
- Count-only: `pagination[pageSize]=1`, read `meta.pagination.total`
- List places: `GET /api/places?populate[country][fields][0]=name&fields[0]=name&fields[1]=slug&sort=name:asc`
- List drivers: `GET /api/providers?filters[provider_type][name][$eqi]=driver&populate[contacts]=*&fields[0]=fullname&fields[1]=verified&sort=fullname:asc`
- List providers: `GET /api/providers?populate[provider_type][fields][0]=name&populate[contacts]=*&sort=createdAt:desc`
- List provider types: `GET /api/provider-types?fields[0]=name&sort=name:asc`

### Routes

| Route | Access | Purpose |
|---|---|---|
| `/` | any | Redirects to `/dashboard/requests` or `/login` |
| `/login` | public | Strapi login form |
| `/book` | public | Booking form |
| `/dashboard/requests` | protected | Requests list/create/edit |
| `/dashboard/providers` | protected | Providers list/create/edit |

Add new dashboard routes by updating `navItems` in `app/dashboard/layout.tsx`.

### Patterns & gotchas

**Wide tables**: wrap in `<div className="overflow-x-auto">` inside `<Card className="overflow-hidden">`.

**Combobox pattern**: Popover + Command (cmdk) with CommandInput. Always add `onWheel={(e) => e.stopPropagation()}` on `PopoverContent` inside Sheets (Radix scroll lock workaround). Fetch data once at sheet level, pass as props.

**Notifications**: `import { toast } from "sonner"`.

**Pagination**: default `PAGE_SIZE = 20`. TanStack Query keys: `["requests"]`, `["requests-count"]`, `["providers"]`.

**PhoneCode on edit**: restore from `rd?.phoneCode?.flag ?? "kh"` (ISO code), not the dial code string.
