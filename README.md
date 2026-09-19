# bnb-ops — AI Operations Manager for Short-Term Rentals

Guest AI chat per reservation, host dashboard, automated emails, ICal sync,
and cleaner operations for property managers with 10–50 listings.

- **Product plan:** [`PLAN.md`](./PLAN.md)
- **Technical plan (authoritative for implementation):** [`PLAN-CLAUDE.md`](./PLAN-CLAUDE.md)

## Stack

Next.js (App Router) + TypeScript · Supabase (Postgres + Auth + RLS) ·
Drizzle ORM · Resend · Inngest · Vercel.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values (see PLAN-CLAUDE.md §8)
npm run db:generate          # drizzle migration from schema (already committed)
npm run db:migrate           # apply tables + RLS against DATABASE_URL
npm run dev
```

Inngest dev server (jobs run locally):

```bash
npx inngest-cli dev
```

## Deployment (Vercel + Supabase)

Follow the click-by-click checklist in `PLAN-CLAUDE.md` §8: Supabase project
and migrations, Resend domain, Vercel import + env vars, Inngest app pointing
at `/api/inngest`.

## Implementation deviations from PLAN-CLAUDE.md

1. **Guest chat streaming** uses the OpenAI SDK + a hand-rolled SSE/plain-text
   stream instead of the Vercel AI SDK (`ai` package). Same behavior: streamed
   tokens, single `escalate_to_host` tool, persistence after the stream
   (`onFinish` equivalent), host-reply polling. Fewer moving parts, one less
   dependency to track breaking changes in.
2. **Host dashboard data access** uses the Drizzle connection guarded by
   `requireOrgMember()` with explicit `org_id` scoping on every query, instead
   of the cookie-bound supabase-js client per page. RLS remains enabled and
   enforcing for any cookie-client path (auth/profile flows). Rationale: one
   typed query path; complex joins (today view, inbox joins) are simpler and
   safer to review than two parallel data layers.
3. **Event-driven Inngest functions** live in one file
   (`src/lib/inngest/f/events.ts`) rather than four; cron jobs kept separate.
4. **Ingestest dev keys**: `INNGEST_*` env vars are optional locally — the
   Inngest dev server registers functions without keys.
