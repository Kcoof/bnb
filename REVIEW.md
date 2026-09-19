# REVIEW.md — MVP implementation vs PLAN-CLAUDE.md

Static review (no live DB). Build/lint pass. Focus order per brief: security → money flows → data model → guest chat → dashboard UX.

**Verdict on the four README deviations** (judged first, as requested):

1. **OpenAI SDK instead of Vercel AI SDK — acceptable**, but it is exactly where the one functional CRITICAL lives (C3): the AI SDK would have translated DB roles to API roles; the hand-rolled path must do it itself and doesn't.
2. **Drizzle + `requireOrgMember()` + manual `org_id` scoping instead of cookie-bound supabase-js — acceptable.** I checked every `(dash)` page and every action in `src/app/actions/`: all call `requireOrgMember()` and scope reads/writes by `org_id` (the one exception is M8). But this deviation only works *because* RLS was supposed to remain the backstop for the PostgREST/anon-key surface — and that backstop is broken (C1/C2), which the Drizzle-everywhere approach hides from view.
3. **Event functions in one file — fine**, no behavioral difference.
4. **Optional Inngest keys — dangerous as implemented.** "Optional locally" is fine; the same optionality silently extends to production where it may leave `/api/inngest` invocable without a signature (M6).

---

## CRITICAL (must fix before deploy)

### C1. `drizzle/0002_rls.sql` cannot apply — it creates policies referencing `org_id` on `property_knowledge`, which has no such column
- **Where:** `drizzle/0002_rls.sql:72-88` (the generic policy loop includes `'property_knowledge'`); schema `src/lib/db/schema.ts:138-156` (no `orgId`), `drizzle/0000_init.sql:116` (confirmed).
- **What:** `create policy property_knowledge_member_select ... using (org_id = public.current_org_id())` fails at CREATE time (`column "org_id" does not exist`). The whole script runs as one implicit transaction via `scripts/apply-rls.mjs` (`sql.unsafe`), so **everything rolls back: no RLS at all, no auth FK**. It also fails silently from a deploy perspective: `drizzle/meta/_journal.json` has only `0000_init`, so `npm run db:migrate` (drizzle-kit) never touches `0002_rls.sql`, `apply-rls.mjs` is not referenced by any npm script, and README says `npm run db:migrate # apply tables + RLS`, which is false. The README's claim "RLS enabled via drizzle/0002_rls.sql" is untested against a real DB.
- **Why it matters:** org isolation is the product's core security promise (plan §2.4, Week-1 DoD). With RLS absent, every org boundary rests solely on the manual scoping of deviation #2 — one missed `where` away from a cross-tenant leak, with no second layer.
- **Fix:** give `property_knowledge` its own policies via the owning property, e.g. `using (exists (select 1 from public.properties p where p.id = property_knowledge.property_id and p.org_id = public.current_org_id()))` (the SECURITY DEFINER helper prevents recursion), with `with check` analogues for INSERT/UPDATE; remove it from the generic loop. Wire the script in (`"db:migrate": "drizzle-kit migrate && node scripts/apply-rls.mjs"`), fix the README, and run it once against a real Supabase project — this review could not.

### C2. Privileged RLS policies have no org scoping — any owner/admin of *any* org can update/delete other orgs' rows
- **Where:** `drizzle/0002_rls.sql:50-53` (`org_update`: role check only, no `id = current_org_id()`), `:59-66` (`profiles_update` admin branch and `profiles_delete`: role check only), `:85-87` (`%I_admin_delete` on all 11 org tables: role check only, no `org_id = current_org_id()`).
- **What:** `current_user_role()` returns the caller's role in *their own* org. Any user can self-signup (`signUpAction` is open) and become an `owner`; their JWT then passes these predicates against **every row** through Supabase's REST endpoint (`PATCH/DELETE /rest/v1/...` with the anon key + their session token). Concretely: delete another org's reservations/messages/properties, rewrite another org's `organizations` row, delete their profiles.
- **Why it matters:** this is precisely the "second account sees only their own company's data (nothing of mine)" DoD being violated in the destructive direction. The Drizzle app path never exercises these policies, so nothing in normal use would reveal it.
- **Fix:** AND the org predicate into every privileged branch — `using (org_id = public.current_org_id() and public.current_user_role() in ('owner','admin'))`, and `using (id = public.current_org_id() and ...)` for `organizations`.

### C3. Guest chat sends DB roles to the model API — every request 400s; the core feature is broken
- **Where:** `src/app/api/chat/[token]/route.ts:100-103`; roles originate in `src/lib/ai/prompt.ts:76-92` (`'guest' | 'assistant' | 'host'`).
- **What:** `history.map((h) => ({ role: h.role, ... }) as ChatCompletionMessageParam)` forwards `role: "guest"` and `role: "host"` verbatim. The OpenAI chat-completions API rejects unknown roles (`Invalid value: 'guest'`), and history is never empty: it contains the greeting plus the just-inserted guest message (inserted at route line 82 before `buildSystemPrompt` at line 96). So the very first guest message fails; the `catch` writes a `system_note` and the guest sees "technical hiccup" forever.
- **Why it matters:** Week-3 DoD (chat answering from KB, escalating on money/maintenance) cannot pass at all against an OpenAI-compatible endpoint that validates roles.
- **Fix:** map at the boundary — `guest → "user"`, `host → "user"` (or fold host messages into the system prompt context, they're already there via HOST MESSAGES), `assistant → "assistant"`.
- **Same block, second bug:** route lines 104-111 append the current guest message *again* (`apiMessages.push({role:'user', content: guestMessage})`) even though `history` already ends with it (it was inserted pre-prompt-build). The model sees the same question twice, and only the duplicate carries the pre-filter note. Either exclude the current message from the history window or drop the manual push and put the pre-filter note on the history copy.

---

## MAJOR (should fix soon)

### M1. ICS date-only values converted in UTC, not property timezone — reservations can shift a day
- **Where:** `src/lib/ics.ts:22-25` (`toDateOnly` → `toISOString().slice(0,10)`), used at `:74-75`.
- **What:** channel feeds mix all-day DATE values (safe, UTC midnight in node-ical) and TZ-qualified datetimes. For the latter, a booking starting `2026-09-20T01:00+10:00` (property in Brisbane) becomes check-in `2026-09-19`. Everything downstream (token window, status tick, email timing, digest) inherits the wrong date. This is the exact date-only/timezone edge the plan flags (§5.1).
- **Fix:** `formatInTimeZone(new Date(event.start), property.timezone, 'yyyy-MM-dd')` — the property row is already loaded in `syncPropertyIcs`.

### M2. `messages-dispatch` sends email inside the claiming transaction — rollback re-sends already-sent emails
- **Where:** `src/lib/inngest/f/messages-dispatch.ts:17-97` (single `db.transaction` wraps claim + up to 50 sequential Resend HTTP calls + updates).
- **What:** `sendEmail` (`src/lib/mail.ts:137-152`) returns `{error}` for API errors but **throws** for network/timeout failures; `templateVars`/`renderEmail` can also throw. Any throw after earlier rows were marked `sent` rolls back the whole transaction — those rows return to `pending` and are **sent again** next run. Additionally the route has no `maxDuration` and a 50-email batch of sequential HTTP calls holds `FOR UPDATE` row locks for potentially minutes (Vercel timeout mid-batch produces the same rollback-and-duplicate).
- **Why it matters:** duplicate guest emails are the most visible failure mode this product has; plan §5.4's idempotency column exists precisely to prevent this.
- **Fix:** claim in a short tx (set `status='sending'`/increment attempts, commit), send outside any tx, then finalize per row with a conditional update; or one small tx per row. Comment at `:8-10` acknowledges the crash window but not the rollback path.

### M3. Cancelled reservations still get scheduled emails; cancellation doesn't cancel pending messages or open tasks
- **Where:** `src/lib/inngest/f/messages-dispatch.ts:46-67` (only checks `guestEmail` and the welcome-48h rule, never `resv.status`); `src/lib/ics.ts:92-101` and `:159-166` (both cancel paths set `status='cancelled', chatToken=null` and stop).
- **What:** plan §1.4 requires cancellation to "cancel pending messages + open task", and §5.2 requires suppression "when no guest email **or reservation cancelled**". A cancelled direct booking with an email address still receives check-in/checkout emails after cancellation — guest-visible money-adjacent wrongness (and the chat link in them is dead).
- **Fix:** in dispatch, `if (resv?.status === 'cancelled') → status='skipped', error='reservation cancelled'`; in both ICS cancel branches, `update scheduled_messages set status='cancelled' where reservation_id=... and status='pending'` and cancel an open task.

### M4. `status-tick` departure only fires on exactly the checkout day — a missed day sticks the property at `occupied` forever
- **Where:** `src/lib/inngest/f/status-tick.ts:70` (`.find((r) => r.checkOut === today)`), under `prop.status === "occupied"` (`:59`).
- **What:** if the tick doesn't run while `checkOut === today` (Inngest outage, deploy gap, property temporarily in another status at that moment), the window closes permanently: reservation stays `arrived`, no task is created, property stays `occupied` until a human notices. This directly contradicts the plan's self-healing claim (§5.5 "derives state rather than counting events"); note the arrival branch already does it right with `checkIn <= today && today < checkOut` (`:38`).
- **Fix:** `r.checkOut <= today` (and consider relaxing the `prop.status === 'occupied'` precondition so the reservation→`departed` + task creation also self-heal from `needs_cleaning`/`cleaning`).

### M5. `createAdHocTaskAction` doesn't validate the cleaner's org — cross-org task assignment and data leak
- **Where:** `src/app/actions/tasks.ts:110-164` — `cleanerId: input.cleanerId || null` (`:139`) is used with no org check, unlike `assignCleanerAction` (`:23-32`) which validates correctly.
- **What:** a staff member of org A can pass a cleaner UUID from org B (server-action inputs are untyped JSON at runtime). The task then emails org B's cleaner a link that opens org A's property address — cross-tenant disclosure through the `cleaner-assigned` event.
- **Fix:** same guard as `assignCleanerAction`: look the cleaner up `and(eq(cleaners.id, ...), eq(cleaners.orgId, member.profile.orgId))` before inserting, and skip assignment if not found.

### M6. `/api/inngest` may be invocable unauthenticated in production when the signing key is unset
- **Where:** `src/lib/inngest/client.ts:4-8` (key optional), `src/app/api/inngest/route.ts:14-26` (no production guard, and no `maxDuration` per plan §1.3).
- **What:** deviation #4 makes `INNGEST_*` optional "locally", but nothing distinguishes local from production. If the key is forgotten in one environment, anyone can POST to invoke functions (trigger sends, re-run syncs, replay event functions with chosen payloads). A config mistake becomes a security hole with no error anywhere.
- **Fix:** in the route (or client), `if (process.env.NODE_ENV === "production" && !process.env.INNGEST_SIGNING_KEY) return 404/500` — fail loudly. Add `export const maxDuration = 60`.

### M7. Guest/cleaner-controlled text is interpolated unescaped into host emails — HTML injection
- **Where:** `src/lib/inngest/f/events.ts:63-65` (escalation `summary` straight into HTML), `src/lib/inngest/f/digest.ts:88-117` (guest names, summaries, sync errors unescaped), `src/lib/mail.ts:29-31` (`render` does raw string substitution of KB/guest values into HTML).
- **What:** a guest (via chat escalation summary) or cleaner (via report-problem text) can inject markup/links into an email the host trusts — phishing inside the product's own urgent-looking "⚠ URGENT" mail. Email clients won't run scripts, but inline links/branding in an escalation alert are a real social-engineling surface.
- **Fix:** HTML-escape every interpolated variable in `render`, `escalationCreated`, and the digest builder before insertion (templates themselves stay raw).

---

## MINOR (fine to defer)

- **8s throttle weakened** — `src/app/api/chat/[token]/route.ts:63` checks the last message of *any* role, so the throttle only bites between consecutive guest messages; after an assistant reply (or an error `system_note`) the guest can send immediately. Plan says "≥8s since last guest msg". The 60/24h cap (✓ implemented) still bounds cost. Fix: compare against the newest `role='guest'` row.
- **`after` query param unvalidated** — `src/app/api/chat/[token]/messages/route.ts:29` `new Date(after)` on garbage → Invalid Date → driver error → 500. Also missing `x-robots-tag: noindex` here (present on POST).
- **`applyStatus` TOCTOU** — `src/lib/status.ts:38-51` read-then-update without a conditional `where status = <read>`; concurrent transitions can apply an illegal move. Low likelihood (single cron + rare manual races).
- **Transitions map duplicated client-side** — `src/app/(dash)/board/StatusChangeMenu.tsx:8-14` copies `allowedTransitions` instead of the server passing it; will drift. Also `prompt()` for the reason note is rough.
- **Plan §6 gaps (UX):** board lacks current/next reservation, open task, and "needs attention" badges (`src/app/(dash)/board/page.tsx`); dashboard lacks one-click resolve-escalation; reservations table lacks copy-chat-link/quick-add-email; cleaner page lacks the checklist and shows `dueAt` in UTC (`src/app/c/[token]/page.tsx:43`); reservation page has no per-message "resend" for skipped emails; inbox has no "mark all read" control (action exists but only auto-fired per conversation). None block the flows.
- **Inbox N+1** — `src/app/(dash)/inbox/page.tsx:47-57` one query per conversation for the last message (≤100 extra queries). Use a lateral/window function later.
- **Digest breadth/retry** — `src/lib/inngest/f/digest.ts:67-71` lists all pending tasks (not due-today, plan sketch says "tasks due"); a failed digest send isn't retried or surfaced until the next day.
- **Date edits under-reschedule** — `src/app/actions/reservations.ts:110-115` only re-fires `reservation/created` when `status === 'upcoming'`; an `arrived` reservation whose checkout moves won't reschedule its pending checkout email, and task `dueAt` is never recomputed on date change.
- **`URL.parse` needs Node ≥22** — `src/lib/ics.ts:15`; on Node 20 the throw is swallowed by the sync's outer catch and the property just shows a sync error. Use `new URL(url).hostname` with try/catch.
- **Event-function email idempotency** — `escalationCreated`/`guestReply`/`cleanerAssigned` record nothing, so an Inngest retry after a successful send duplicates the email (plan's "one per escalation" row). Write an `events` row like the digest does.
- **HOST MESSAGES limited to the 20-message window** — `src/lib/ai/prompt.ts:84-91` takes host messages from the last-20 slice, not the last 5 host messages of the conversation; older host answers silently drop out of ground truth.
- **Pre-filter is English-only** — `src/lib/ai/prompt.ts:166-171` vs plan §4.4 "in the supported languages". Acceptable for MVP if English is the declared support set; note it in docs.
- **Dead dependency** — `zod` in `package.json` but unused; either use it for server-action inputs (would have caught M5) or remove it.
- **Signup partial failure** — `src/app/actions/auth.ts:22-40` creates the auth user before org/profile inserts; a failure orphans a user with no profile (can't log in usefully, but clutters). Wrap or reconcile.
- **Schema drift (small)** — `escalations.taskId` has no FK to `tasks` (`src/lib/db/schema.ts:241`) unlike every other reference in the plan's §2.3. Everything else in §2.3/§2.4 matches: all 12 tables, enums, uniques (`(propertyId, externalUid)`, `(reservationId, type)`, `chatToken`, `tasks.token`, `tasks.reservationId`, `(orgId, type)`), and indexes are present.

---

## Areas checked and found sound (one line each)

- **Token validation** (`src/lib/tokens.ts`): prefix check, 256-bit CSPRNG, hold/status/window re-checked on every request; `validateTaskToken` honors the +7d closed window — matches §3.3.
- **Dashboard authorization sweep:** every `(dash)` page and every action in `src/app/actions/` (except M5) calls `requireOrgMember()` and scopes by `org_id` on reads and pre-write ownership checks; `settings` role gates match the plan's matrix.
- **Cleaner public actions** (`src/app/actions/cleaner.ts`): token-gated, state preconditions correct, report-problem inserts escalation + emits the Inngest event (§1.4 cleaner flow).
- **Streaming route mechanics:** tool-call fragment assembly uses a per-request `Map` inside the stream closure (route line 119 — not module-level, verified); error path inserts `system_note` without a fake assistant message; escalation insert + `escalation/created` emission present; 2000-char and 60/day limits enforced.
- **`ensureScheduledMessages`/`ensureConversation`:** correct unique-key idempotency, pending-only reschedule on date change, cancelled/hold short-circuit; welcome-48h skip enforced (at dispatch, equivalent outcome).
- **`ensureCleaningTask`:** unique-per-reservation with `onConflictDoNothing`, `dueAt` = checkout + 30min in property-local time; auto-assign only when exactly one active cleaner is a sensible, documented-in-code narrowing.
- **Secrets:** only `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` are public; `server-only` guards on `lib/db`, `lib/supabase/*`, `lib/mail`, `lib/ai/*`; `.env.example` matches §8.1; robots + metadata noindex on public pages.
- **`allowedTransitions`** (`src/lib/status.ts`) matches plan §2.2 exactly.
- **Inngest v4 syntax:** all eight functions use `triggers: [{ cron }]` / `triggers: [{ event }]` correctly; crons match §5.4.

---

## Verdict

**FIX FIRST** — C1/C2 leave org isolation unenforced at the database layer (and the RLS migration cannot even apply), and C3 means the flagship guest-chat feature 400s on its very first message, so neither the security posture nor the core demo survives contact with a real deployment.
