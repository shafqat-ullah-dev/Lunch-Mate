# Lunch-Mate

A team lunch expense tracker. Log a day's lunch bill, record who ate (shares)
and who paid (payments), and Lunch-Mate settles the running balances —
including settlement-aware reimbursement when the group overpays. Multi-org,
role-based (admin vs. member), with web-push notifications.

Built with Next.js (App Router) + Supabase (Postgres, Auth, RLS).

## Tech stack

- **Next.js 16** (App Router, Server Actions) + **React 19**
- **Supabase** — Postgres, Auth, Row Level Security
- **Tailwind CSS 4** + **shadcn/ui** (Radix primitives) + **lucide-react**
- **Recharts** for charts, **web-push** for notifications
- **Vitest** for unit tests

## Getting started

Requires Node 20+ and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Other scripts:

```bash
pnpm build        # production build (type errors fail the build)
pnpm lint         # eslint (flat config, Next core-web-vitals + TS)
pnpm test         # run the Vitest suite
pnpm test:watch   # watch mode
```

## Environment variables

Create `.env.local` (never commit it):

```bash
# Supabase — from Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # server-only; used for admin name sync

# Web push (VAPID) — generate with: npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
```

`SUPABASE_SERVICE_ROLE_KEY` and `VAPID_PRIVATE_KEY` are secrets — keep them
server-side only. Never expose them with a `NEXT_PUBLIC_` prefix.

## Database setup

Apply the SQL in `scripts/` in numeric order against your Supabase project
(SQL editor or `supabase db` tooling). Highlights:

- `001` … `007` — tables, RLS recursion fixes, org bootstrap, currency, notes,
  push subscriptions.
- **`008_secure_lunch_tables_rls.sql`** — enables Row Level Security on the
  money tables (`lunch_users`, `lunch_entries`, `lunch_shares`,
  `lunch_payments`). **Apply this.** Without it, org isolation on those tables
  is enforced only in application code, so a signed-in user could read another
  org's expenses directly through the Supabase client. The migration is
  idempotent; verify existing rows have `org_id` populated before relying on it.

## Project layout

```
app/                 App Router routes
  (dashboard)/       Authenticated dashboard (admin/ + user/ views)
  api/invite/        Invite accept/validate/cleanup endpoints
  auth/, login/, signup/, onboarding/, *-password/
lib/
  actions.ts         Server actions: entries, users, balances, stats
  settlement.ts      Pure money math (unit-tested)
  org-actions.ts     Org/role authorization
  push-actions.ts    Web-push fan-out
  date-utils.ts      Date formatting/grouping helpers
  supabase/          client / server / admin Supabase factories
components/          UI (dashboard/, ui/ shadcn primitives)
scripts/             SQL migrations
```

## How balances work

Each lunch entry has a total, a set of **shares** (what each person owes) and
**payments** (what each person actually put in). `lib/settlement.ts` computes
per-person balances. When the group pays more than the bill, the excess is
reimbursed to the overpayers in proportion to how much they overpaid, so credit
lands on whoever fronted the money. See `lib/settlement.test.ts` for worked
examples.
