# PERF-REVIEW — implementation vs PERF-PLAN.md

Reviewed commit `819bc3d` (+ poll fix `9dd1ddd`) against PERF-PLAN.md. Code only;
no live testing (orchestrator's live numbers taken as given). `npm run build` /
`npm run lint` pass per context.

## Verdict: **FIX FIRST** — C1 double-writes escalations on the primary AI path
(duplicate rows + duplicate host alerts); it is a small delete, but shipping it
means corrupting the escalation feed from day one.

---

## CRITICAL

### C1. AI path inserts every escalation TWICE (stale block left behind)
`src/app/api/chat/[token]/route.ts:379-394`

The new parallel batch (route.ts:341-377) already inserts the escalation
(routes.ts:358-373, capturing `escId`) and fires `after(() => sendEvent(...))`
(route.ts:376). The old sequential block immediately below — `if (escalation)
{ const inserted = await db.insert(escalations)... }` (route.ts:380-393) — was
not deleted. Consequences on every AI escalation:

- **Two escalation rows** (no unique index on `escalations` dedupes them —
  schema has only `escalations_org_status_idx`), so the host inbox shows each
  escalation twice.
- **Two Inngest `escalation/created` events** → two host emails/SMS when
  Inngest is configured.
- The second `await sendEvent(...)` (route.ts:392) runs inline inside the
  stream's `start()` and blocks `controller.close()` — exactly the latency the
  `after()` migration was supposed to remove.

**Fix:** delete route.ts:379-394 entirely. (Diff against `819bc3d~1` confirms
this is the old post-stream block, verbatim.)

## MAJOR

### M1. Paused org now 404s the guest instead of showing the notice
`src/app/chat/[token]/page.tsx:18` — `if (!ctx || !ctx.chatEnabled) notFound();`

The old page rendered the "Concierge is briefly unavailable — the host has been
notified" notice when `chatEnabledForOrg` was false (verified in `819bc3d~1`).
Now a guest of a paused/canceled-subscription org gets a generic 404, and
PERF-PLAN §6 step 4's done-when ("paused org still shows the notice") fails.
**Fix:** split the branches — `if (!ctx) notFound();` then `if (!ctx.chatEnabled)`
return the old notice markup (it is in git history at `819bc3d~1`, page.tsx).

### M2. §1.4 phase consolidation only half-done: AI path still ~9 sequential DB phases
`src/app/api/chat/[token]/route.ts:135` + `src/lib/ai/prompt.ts:53-113`

`buildSystemPrompt(reservation.id)` was left as-is instead of consuming the
context `loadGuestChatContext` already fetched. It re-runs the
reservation/property/KB/org JOIN (prompt.ts:53-65 — a duplicate of phase 1),
re-looks-up the conversation (prompt.ts:69-76 — `ctx.conversationId` is already
known), then runs history → host msgs → appliances → FAQs sequentially
(prompt.ts:81-113). Sequential phases before the first token: context, rate,
persist, then 6 more = **9** (plan promised ≤4; "3 sequential DB phases before
the first token (was 12)"). The plan's Phase-2 `Promise.all` over reads was
never implemented, and the "append the just-sent guest message in JS"
optimization was skipped too. The emergency path likewise re-queries the KB
(route.ts:142-149) although `ctx.kb.emergencyInfo` is already loaded — the plan
explicitly said the phase-1 row replaces that query. *(The live checks only
timed the throttled pre-persist path, so this went unnoticed.)*
**Fix:** overload `buildSystemPrompt(reservationId, ctx?)` to accept
`{reservation, property, kb, conversationId}` and skip its first two queries;
wrap history/host/appliances/faqs in `Promise.all`; use `ctx.kb.emergencyInfo`
in the emergency path and delete its KB query.

### M3. `sendEvent` still awaited on the fast-fail and emergency paths
`src/app/api/chat/[token]/route.ts:124` and `route.ts:185`

PERF-PLAN §1.4: wrap the **three** `await sendEvent(...)` calls in `after()`.
Only the (duplicated) AI-path one at route.ts:376 is wrapped. With Inngest
configured, the fast-fail and emergency responses — the paths where the whole
point is instant reply — wait on the event send. **Fix:** wrap both in
`after(() => sendEvent(...))` (after deleting C1's stale copy).

## MINOR

1. **Poll validity window is ~1 day wider than POST/page validity.**
   `src/app/api/chat/[token]/messages/route.ts:30` — `check_out >= current_date
   - interval '2 days'` admits through *end of* check-out+2 (UTC), while the JS
   gate (`tokens.ts:132`, midnight-UTC arithmetic) cuts off at *midnight
   starting* check-out+2, i.e. end of check-out+1. Read-only impact (guest can
   receive host replies one extra day; POST still 404s). Fix:
   `interval '1 days'` to match, or accept and note the asymmetry.
2. **Poll dropped the 404 contract for dead links.** Old route returned
   `404 link_not_active` for an invalid token; new one returns `200 {messages:
   []}` (messages/route.ts:38). `ChatWidget.tsx:39-41`'s "This link is no
   longer active." handling is now dead code — a link expiring mid-session
   polls silently forever. Plan test 1 expected 404. Fix: keep `{messages: []}`
   only for the valid-token/no-conversation case; 404 otherwise (as before).
3. **Settings sub-nav (plan M3) not implemented — commit message claims it.**
   `src/app/(dash)/settings/page.tsx:23-25` is byte-identical to pre-commit
   (ad-hoc `px-3 py-1.5` link ≈ 31px target, not the `segmented` /
   `segmented-item` pattern), yet commit `819bc3d` says "settings sub-nav on
   token classes" and the file isn't in the commit's stat. Fix: apply the plan's
   `segmented` classes (active span already uses them).
4. **Fast-fail and emergency write batches are sequential, not parallel.**
   route.ts:105-122 (reply then escalation) and route.ts:160-186 (reply, conv
   update, escalation). Plan §1.4 specified one `Promise.all` phase each
   (~200ms/round trip at current region). No correctness issue — the writes are
   independent. Fix: wrap each group in `Promise.all`.
5. **Admin "unlimited (billing off)" nit neither implemented nor noted.**
   `src/app/admin/page.tsx:69` still `sub?.propertyLimit ?? 0` (renders `n/—`
   with billing off). Plan marked it optional; fine to skip, but record the
   decision. Nits in the same file's neighborhood: the poll route's
   `innerJoin(properties, ...)` (messages/route.ts:20) selects/filters nothing —
   drop it; `validateGuestToken`/`chatEnabledForOrg` are now caller-less dead
   exports (plan said keep them for `/q/`, `/c/` callers — those never existed;
   harmless, but they are dead code and their billing gate is now duplicated in
   `tokens.ts:136-148`, a future drift risk).

## Passing (verified)

- **§1.1 middleware** — `src/lib/supabase/middleware.ts:55-80`: `getSession()`
  redirect decision, network `getUser()` only when missing/≤60s-to-expiry,
  `setAll` cookie persistence and `supabaseResponse` reassignment intact
  (refresh-in-middleware preserved); `/api/` join `/chat|/c|/q` in the skip
  list. `/pricing` public + handles anon with a sign-in prompt
  (`pricing/page.tsx:15-28`); `/billing/*` not public → anon redirected, page
  also self-gates; `/admin` self-gates via `ADMIN_EMAILS` + `requireOrgMember`.
  No route newly reachable; no signed-out flow broken.
- **§1.2 `cache()`** — `src/lib/auth.ts:20` wraps the unchanged body; React
  `cache()` is per-request, so layout/page share one `getUser()`+profiles while
  server actions keep their own call. No shared-context hazard.
- **§1.4 phase 1 correctness** — `loadGuestChatContext`
  (`src/lib/tokens.ts:100-157`) matches `validateGuestToken` exactly (prefix,
  `isHold`, `isConcierge` bypass, status, ±window with identical midnight-UTC
  arithmetic) and `chatEnabledForOrg` exactly (no-row=enabled,
  active/trialing, past_due 7-day grace incl. no-period-end=Infinity, else
  false). Joins can't multiply rows (`conversations.reservationId` and
  `subscriptions.orgId` are unique). Combined rate-limit query is correct
  (max guest `created_at` + 24h count, literals inlined). Parallel write
  batches write independent rows — no races. Error contracts 404/402/400/413/
  429 all present and unchanged (route.ts:40,43,48,56,59,76,79). Escalation
  rows created in all three paths (fast-fail :112, emergency :173, AI :358 —
  plus the C1 duplicate).
- **§1.5 page + poll mechanics** — chat page is single-query; poll JOIN is one
  query with interval literals inlined (the `9dd1ddd` pooler fix is in place),
  `after` cursor validated (`new Date` + NaN guard), ordering/system_note
  filtering identical to before. (Window width + 404 contract: see minors.)
- **§2 property limit** — `wizard-v2.ts:36-57` gates only when
  `STRIPE_SECRET_KEY` is set, logic byte-equivalent to the old check inside the
  guard; audit tag `billing: "pre-launch-unlimited"` at :103-105. No other
  enforcement path exists to bypass (only the webhook writes `propertyLimit`).
- **§4 mobile (2 of 3)** — `layout.tsx:15-19` viewport export with
  width/initialScale/viewportFit; inbox copy-link now `h-9 px-2.5`
  (`inbox/[id]/page.tsx:73`). Settings nav: minor 3 above.
- **§1.3 callback** — reuses `exchangeCodeForSession` user; `getUser()` only on
  the no-code path. Clean.
- **No unused imports** in any touched file; build/lint green.

## Test-coverage gaps (for the next live pass)

The orchestrator's live checks covered middleware timing, guest page load, the
throttled (pre-persist) POST, and poll basic function. Not covered, and all
affected by findings above: an **AI-configured** end-to-end message (would have
surfaced C1's duplicate escalation rows/emails), a **paused org** page load
(M1), and a **link expiring mid-session** (minor 2).
