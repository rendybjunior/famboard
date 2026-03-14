# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

FamBoard is a mobile-first family activity tracker built around a Reading Time <> Screen Time exchange system. Kids log reading minutes, parents approve them, and approved minutes become redeemable screen time. Roles are Parent (approves, manages family) and Kid (submits reading, redeems screen time).

## Commands

- `npm run dev` — Start Vite dev server
- `npm run build` — TypeScript check + Vite production build (`tsc -b && vite build`)
- `npm run lint` — ESLint
- `npm run preview` — Preview production build locally

No test framework is configured.

## Tech Stack

- **Framework:** React 19 + React Router 7 (SPA, not SSR)
- **Build:** Vite 7 with TypeScript (strict mode, ES2023 target)
- **Styling:** Tailwind CSS 4 via `@tailwindcss/vite` plugin
- **UI Components:** shadcn/ui pattern with base-ui-react primitives in `src/components/ui/`
- **Server State:** TanStack React Query (30s stale time)
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Notifications:** sonner (toast)
- **Icons:** lucide-react

## Architecture

### Data Flow

```
Supabase (DB + Auth + RLS) → React Query Hook → Component → UI
```

There is no custom backend server. All data access goes directly from the browser to Supabase, secured by Row-Level Security policies. Business logic that requires atomicity lives in PostgreSQL RPC functions (see `supabase/migrations/`).

### Key Directories

- `src/contexts/auth-context.tsx` — Global auth state. Wraps Supabase session + the user's `family_members` record (role, family_id, display_name). All role-based logic derives from `membership.role`.
- `src/hooks/` — React Query hooks for each domain: `use-family.ts`, `use-reading-entries.ts`, `use-redemptions.ts`, `use-balances.ts`. These are the data layer — mutations invalidate related query keys.
- `src/pages/` — Route-level components. Dashboard dispatches to `parent-dashboard.tsx` or `kid-dashboard.tsx` based on role.
- `src/components/ui/` — shadcn/ui primitives (button, card, dialog, input, etc.). Generated, not hand-written.
- `src/lib/supabase.ts` — Supabase client singleton.
- `supabase/migrations/` — Numbered SQL migrations defining schema, RLS policies, indexes, and RPC functions.

### Query Key Conventions

- `["family", familyId]`, `["family-members", familyId]`
- `["reading-entries", filters]`, `["redemptions", filters]`
- `["kid-balances", kidId]`, `["pending-count", familyId]`

### Database

All tables use RLS. Kids see only their own entries; parents see all family entries. Key tables: `families`, `family_members`, `reading_entries`, `redemptions`. `kid_balances` is a view computing balance as `SUM(approved_reading) / redemption_rate - SUM(approved_redemptions)`.

RPC functions handle atomic operations: `create_family`, `add_kid_to_family`, `add_parent_to_family`.

### Auth

Supabase Auth with email/password and Google SSO. Email confirmation is disabled. Sessions last 30 days with rolling refresh. The `<ProtectedRoute>` component guards authenticated routes; `auth-context.tsx` provides session and membership to the tree.

### Path Alias

`@/*` maps to `./src/*` (configured in both tsconfig and vite.config).

## Deployment

SPA deployed to Vercel or Netlify. Both configs exist with catch-all rewrites to `index.html`. Build output goes to `dist/`.

## Environment Variables

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase publishable anon key

## UI Conventions

- Mobile-first layout capped at 448px (32rem) width with fixed bottom nav bar
- Purple/pink gradient theme defined in CSS variables in `src/index.css`
- Large tap targets (44px+) for mobile usability
- Reading entries capped at 180 minutes (`MAX_READING_MINUTES` in `src/lib/constants.ts`)
