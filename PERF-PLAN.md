# AUTOMI — Performance & UX Fix Plan (PERF-PLAN)

**Scope:** code-only fixes for P1 (navigation speed), P2 (property limit blocks owner), P3
(session/cookie audit), P4 (mobile-first). No new npm packages. No data-model changes.
Security boundaries (service-role drizzle client gated by `requireOrgMember()` →
`getUser()` + profiles row; guest token validation) are preserved everywhere.

**Standing assumption:** Vercel stays `iad1` while Supabase is `ap-southeast-1`
(~190–220ms RTT per sequential DB/auth round trip). Every fix below is still worth
doing after a region move — fewer round trips compounds — but none depends on it.
A region move (Vercel function → `sin1`, or DB → US East) remains the single
highest-leverage change and is recommended separately; it is out of scope here.

---

## 0. Verified findings (what the code actually does today)

All reported problems confirmed:

| # | Finding | Evidence |
|---|---------|----------|
| F1 | Middleware calls `supabase.auth.getUser()` (network) on **every** request, including all host navigations | `src/lib/supabase/middleware.ts:49-51` |
| F2 | The middleware matcher also matches `/api/*`, and the early-skip list covers `/chat/`, `/c/`, `/q/` but **not `/api/`** — so every guest chat POST *and every 15s poll* pays the host-auth round trip before the route even runs | `src/middleware.ts:13`, `src/lib/supabase/middleware.ts:11-17` |
| F3 | Every (dash) render does **3 network auth calls + 2 profile queries**: middleware `getUser()` + layout `requireOrgMember()` (`getUser()`+profiles) + page-level `requireOrgMember()` again (`getUser()`+profiles). Layout and page do not share the work | `src/app/(dash)/layout.tsx:13`, every page (e.g. `src/app/(dash)/dashboard/page.tsx:20`) |
| F4 | Link prefetching amplifies F1/F3: the App Router prefetches (dash) links in the viewport, each triggering a middleware `getUser()` network call in the background | matcher + prefetch defaults |
| F5 | Guest chat POST, fast-fail path (no `AI_API_KEY`): middleware auth + 9 sequential DB round trips (token validate, billing, conversation, last-guest, daily count, insert msg, update conversation, insert reply, insert escalation) | `src/app/api/chat/[token]/route.ts:37-154` |
| F6 | Guest chat POST, AI path is worse: after the 7 pre-insert round trips, `buildSystemPrompt()` adds **5 more sequential round trips** before the first token (context join, conversation, history, host msgs, appliances, faqs) | `src/lib/ai/prompt.ts:53-113` |
| F7 | Guest chat page load = 2 sequential queries (`validateGuestToken` then `chatEnabledForOrg`); the 15s poll = 3 sequential queries | `src/app/chat/[token]/page.tsx:18-20`, `src/app/api/chat/[token]/messages/route.ts:15-44` |
| F8 | Property limit: `limit = sub?.propertyLimit ?? 1` — orgs with no subscription row (Stripe not configured, so a row can never appear) are capped at 1 property. The paywall cannot be completed → hard block | `src/app/actions/wizard-v2.ts:33-49` |
| F9 | `await sendEvent(...)` blocks the guest response whenever Inngest *is* configured | `src/app/api/chat/[token]/route.ts:145,206,391` |
| F10 | `/auth/callback` calls `exchangeCodeForSession()` and then throws the result away and calls `getUser()` again — one extra network auth call on every login | `src/app/auth/callback/route.ts:13-24` |

The codebase already has the right philosophy for F8 elsewhere — `chatEnabledForOrg`
returns `true` for "no billing row yet (pre-launch/dev)" (`src/lib/plans.ts:41`) and
onboarding skips the `/pricing` gate when Stripe keys are absent
(`src/app/onboarding/page.tsx:15`). The wizard limit check is the one place that
forgot it.

---

## 1. P1 — Navigation speed (code-side only)

### 1.1 Middleware: local session check + expiry-gated refresh

**Change** (`src/lib/supabase/middleware.ts`):

1. Add `/api/` to the early-skip list. Every API route already authenticates itself:
   chat routes validate the guest token, `/api/property-card/*` and
   `/api/stripe/checkout` call `requireOrgMember()`, `/api/stripe/webhook` and
   `/api/inngest` verify signatures, `/api/health` is public. The middleware
   `getUser()` there is pure waste — removing it cuts ~250ms off **every guest
   message send and every 15s poll**, and off host API calls.
2. Replace the unconditional `getUser()` with:
   - `getSession()` (reads/decodes the cookie JWT — no network) for the
     "any session? else redirect to /login" decision;
   - a network `getUser()` **only when** the session is missing or
     `expires_at` is within ~60s of now (decode the exp claim locally). That call
     refreshes the token and persists new cookies via the existing `setAll`
     forwarding — preserving today's session-refresh behavior.

```ts
const { data: { session } } = await supabase.auth.getSession();
const expiresSoon =
  !session?.expires_at || session.expires_at * 1000 - Date.now() < 60_000;
if (session && expiresSoon) {
  const { data: { user } } = await supabase.auth.getUser(); // refresh + persist
  if (!user) return redirectToLogin(request);
}
if (!session && /* existing public-path exemptions */) {
  return redirectToLogin(request);
}
```

**Security trade-off, stated precisely.** `getSession()` parses the cookie JWT
without cryptographically validating it against the auth server, so a client can
forge a cookie blob that middleware treats as "has session". The blast radius is
nil: every (dash) page, server action, and host API route independently calls
`requireOrgMember()` → `getUser()` (network-verified) + a profiles-row lookup, and
renders nothing / redirects when it fails; the drizzle client is service-role and
only ever receives `orgId` taken from that verified profile row — never from
cookies; guest routes are per-row token-gated. A forged cookie therefore buys
exactly one thing: the (dash) shell starts rendering and redirects to /login —
the same outcome as today, one redirect later. It cannot mint a valid Supabase
JWT, so `getUser()` still fails for the forger. **Recommendation: adopt.** The
`requireOrgMember()` boundary is untouched, which is the invariant that matters.

**Why the expiry gate is required (not optional):** the server-component client
swallows cookie writes (`src/lib/supabase/server.ts:23-25` — "middleware refreshes
sessions"). If middleware never refreshed, an expired access token would force a
token-refresh dance inside every page render with no way to persist the result —
a permanent slow path after the first hour. The gate keeps refresh in middleware
at near-zero cost in the common case.

### 1.2 `requireOrgMember()`: React `cache()` per request

**Change** (`src/lib/auth.ts`): wrap the existing function in `cache()` from
`react`, body unchanged:

```ts
import { cache } from "react";
export const requireOrgMember = cache(async (): Promise<OrgMember | null> => {
  // …exactly today's body: getUser() + profiles lookup…
});
```

Layout + page + any nested component in one request now share **one** `getUser()`
+ one profiles query instead of two of each. Server actions are separate requests
and keep their own single auth call — semantics unchanged.

**Options rejected:** a cookie-based org/role hint (any cookie-derived
authorization next to a service-role client weakens the boundary — the profile
query must stay the only source of `orgId`); merging the profile lookup into page
data queries (couples every query to auth, saves nothing over `cache()`).
`cache()` is the safest cheap option.

### 1.3 Login → dashboard chain

**Change** (`src/app/auth/callback/route.ts`): use the session/user returned by
`exchangeCodeForSession()` instead of calling `getUser()` again; only call
`getUser()` on the no-code path. Saves one network auth call (~250ms) per login.

### 1.4 Guest chat POST — consolidate to ≤4 sequential phases

**Change** (`src/app/api/chat/[token]/route.ts` + one new helper). Preserve every
check and error code; only the query shapes change. New phase structure:

- **Phase 1 — context (1 round trip).** New `loadGuestChatContext(token)` in
  `src/lib/tokens.ts`: one SELECT joining
  `reservations → properties → propertyKnowledge (left) → conversations (left, by
  reservation_id) → subscriptions (left, by org_id)` filtered on
  `chat_token = token`. Apply the existing validity logic in JS (token prefix,
  `isHold`, `isConcierge` bypass, status, ±window — same rules as
  `validateGuestToken`); compute `chatEnabledForOrg` from the joined subscription
  columns (no row → enabled, identical to `src/lib/plans.ts:41`); conversation
  missing → 404 `link_not_active`. This single row also carries everything
  `buildSystemPrompt` needs (reservation, property, KB, org) and the emergency
  KB fields — replacing F5's first three round trips, F6's first two, and the
  emergency path's KB query.
- **Phase 2 — reads (1 wall-clock round trip, parallel).** `Promise.all` of:
  (a) one combined rate-limit query on `messages`
  (`max(created_at) filter (where role='guest')` and
  `count(*) filter (where role='guest' and created_at > now()-24h)` in a single
  statement — replaces the two sequential queries), (b) last-20 history +
  last-5 host messages, (c) appliances, (d) FAQs. The just-sent guest message is
  appended to the history in JS (it is known locally), exactly as the DB order
  would produce.
- **Phase 3 — persist guest message (1 wall-clock round trip, parallel).**
  Insert the guest message and update the conversation
  (`lastMessageAt`, `hostUnreadCount + 1`) concurrently — two statements, one
  wall-clock phase.
- **Phase 4 — model call / fast-fail writes.**
  - Fast-fail (no `AI_API_KEY`): insert fallback reply + insert escalation in
    parallel (1 wall-clock phase), then respond. **Total: 4 phases** (was 9).
  - Emergency regex path: insert emergency reply + update conversation + insert
    escalation in parallel. **Total: 4 phases.**
  - AI path: **3 sequential DB phases before the first token** (was 12: F5+F6),
    then stream.
- **Post-stream persistence:** insert assistant reply + update conversation +
  insert escalation move from 3 sequential round trips to one parallel batch.
- **`sendEvent` off the response path:** wrap the three `await sendEvent(...)`
  calls in `after()` from `next/server` (stable in Next 16). Escalation rows are
  the durable record; Inngest latency (or an outage) must never delay the guest.
  `sendEvent` is already failure-safe (`src/lib/inngest/client.ts`), so this is
  purely a latency change.

### 1.5 Guest chat page + poll

- `src/app/chat/[token]/page.tsx`: use `loadGuestChatContext()` — page load drops
  from 2 sequential queries to 1.
- `src/app/api/chat/[token]/messages/route.ts` (runs every 15s per guest): one
  JOIN query `messages → conversations → reservations` on `chat_token`, with the
  validity window expressed in SQL (`is_hold = false` and
  (`is_concierge` or (`status in ('upcoming','arrived')` and window))), plus the
  `after` cursor. 3 round trips → 1. `validateGuestToken` itself stays exported
  and unchanged for its other callers (`/q/`, `/c/` pages).

### 1.6 Expected impact (warm, iad1→Singapore ≈ 200ms/round trip)

| Path | Today (server-side) | After |
|---|---|---|
| Any (dash) navigation | ~5 auth/profile round trips ≈ 1.0–1.2s + page data | 1 auth+profile (~350ms) + page data — **~600ms faster** |
| Login → dashboard | above + callback `getUser()` | one fewer network call — **~250ms faster** |
| Guest chat page | 2 queries + middleware auth | 1 query, no middleware auth |
| Guest chat POST (fast-fail) | ~9 round trips + middleware auth ≈ 6.4s cold | 4 phases, no middleware auth — **≤~1s warm / ≤2.5s cold** |
| Guest chat poll (every 15s) | 3 queries + middleware auth | 1 query, no middleware auth |

Nothing else material found: dashboard/tasks/reservations queries are already
parallelized; `(dash)/loading.tsx` skeleton exists; the inbox N+1 is already a
window-function query. One optional micro-win (skip if risky): the Today page's
timezone round trip (`dashboard/page.tsx:24-28`) could be avoided by joining
`organizations.timezone` into the `requireOrgMember` profile lookup — only do it
if property tz and org tz are guaranteed identical, otherwise leave as is.

---

## 2. P2 — Property limit must not block pre-billing

**Recommendation: pre-launch unlimited when billing is not configured, recorded
in the event log.** Not a local trial row: a fabricated `subscriptions` row
becomes stale truth the Stripe webhook has to reconcile against (fake
`stripe_customer_id`, invented plan/status), and it would contradict
`chatEnabledForOrg`'s "no row = pre-launch" semantics. "No row + no Stripe keys =
not billing-gated yet" keeps Stripe as the only source of truth and returns the
limit automatically the moment `STRIPE_SECRET_KEY` is set — no migration, no
cleanup.

**Exact change** (`src/app/actions/wizard-v2.ts:32-49, 88-96`):

```ts
const billingConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
let preLaunch = false;
if (billingConfigured) {
  const sub = (/* unchanged subscriptions select */)[0];
  const count = (/* unchanged properties count */)[0] ?? 0;
  const limit = sub?.propertyLimit ?? 1;
  const billingOk = !sub || sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";
  if (!billingOk) return { error: "billing" };
  if (count >= limit) return { error: "limit" };
} else {
  preLaunch = true; // no Stripe keys → the paywall cannot be completed; never block
}
```

and tag the audit event:

```ts
await logEvent({ /* unchanged fields */,
  metadata: preLaunch
    ? { via: "wizard-v2", billing: "pre-launch-unlimited" }
    : { via: "wizard-v2" } });
```

(Optional, 3 lines) `src/app/admin/page.tsx:69` — when
`!process.env.STRIPE_SECRET_KEY`, render the limit as `unlimited (billing off)`
instead of `sub?.propertyLimit ?? 0`, so the owner isn't told they have 0.

**Behavior:** with Stripe unconfigured the owner can add properties now; every
creation is visible in the event log with the `pre-launch-unlimited` tag; the
day `STRIPE_SECRET_KEY` is set, the check reactivates byte-for-byte (no-row orgs
get the 1-property free tier and a `/pricing` redirect on onboarding, which
already exists at `src/app/onboarding/page.tsx:15-24`).

---

## 3. P3 — Session/cookie audit (verdict: the design is correct)

Reviewed `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`,
`src/app/auth/callback/route.ts`, `src/app/actions/auth.ts` against the
`@supabase/ssr` 0.12 documented pattern. **No real defects. The owner can be
reassured; the two nits below are optional.**

Verified point by point:

- **Cookie flags.** No custom cookie options are passed anywhere, so
  `@supabase/ssr` defaults apply: `httpOnly: true`, `sameSite: lax`,
  `secure: true` on HTTPS, `path: /`, with automatic chunking of the
  >4KB auth cookie. `lax` is the right choice — the OAuth callback is a
  top-level GET navigation, so the session cookie (and the PKCE verifier cookie)
  survive the Google redirect, including on mobile Safari. First-party cookies →
  no Safari ITP / third-party-cookie problem.
- **Server/client split.** `server.ts` swallows cookie writes from Server
  Components and delegates refresh persistence to middleware — the documented
  division of labor. The middleware's `setAll` forwards refreshed cookies onto
  both the outgoing request and the response — the correct pattern.
- **Session refresh.** Access tokens expire hourly; refresh happens in
  middleware (`getUser()`'s implicit refresh) and persists. §1.1 deliberately
  keeps this via the expiry gate — that is why the plan gates on `expires_at`
  rather than dropping the network call entirely.
- **Phone + laptop simultaneously.** Each browser gets its own independent
  session (own access/refresh token pair in its own cookies). Supabase supports
  N concurrent sessions per user; neither device evicts the other. Refresh-token
  rotation is per-session, so both devices rotate independently. This is the
  behavior the owner wants; nothing to fix.
- **Sign-out coverage.** `signOutAction` uses the default `local` scope: signs
  out the current browser only — the laptop stays signed in when the phone signs
  out, and vice versa. Within one device all tabs share the cookie jar, so every
  tab is signed out on the next server round trip. If a "sign out everywhere"
  button is ever wanted, it is `signOut({ scope: "global" })` — one line, not
  needed now.
- **OAuth/OTP redirect URLs for mobile Safari.** `googleSignInAction` redirects
  to `${APP_URL}/auth/callback`. Requirements (config, not code): `APP_URL` must
  be the production origin in Vercel, and that exact callback URL must be in the
  Supabase Auth "Redirect URLs" allowlist. The OTP flow verifies a 6-digit code
  via a server action — no email-link redirect involved, so no mobile-Safari
  risk. (If the magic *link* in the email is ever clicked instead, it lands on
  the Supabase Site URL — set that to the production origin too.)

Two optional nits: (a) the extra `getUser()` in the callback is wasted latency —
fixed as step 1.3; (b) the login page reads `?error=` from `window.location` at
render (hydration-order nit, cosmetic only).

---

## 4. P4 — Mobile-first audit at 390px

Checked `(dash)` shell/tab bar, all list pages, forms, and guest chat against
DESIGN-PLAN §3.3/§3.14. The redesign is largely implemented to spec. Defects
found in code:

| # | Defect | Where | Fix |
|---|---|---|---|
| M1 | **`viewport-fit=cover` is missing.** The tab bar and chat header/composer use `env(safe-area-inset-*)`, but without `viewport-fit=cover` iOS reports those insets as 0, so the paddings are inert and notched-landscape can clip under the notch | `src/app/layout.tsx` (no `viewport` export) | Add `export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };` (must include width/initialScale — exporting replaces Next's defaults). The existing `env()` paddings then do their job. |
| M2 | "Copy chat link" button is `h-7` (28px) — far below the 44px touch-target rule (§1) | `src/app/(dash)/inbox/[id]/page.tsx:73` | Bump to the `icon-btn` pattern (h-9) or `h-9 px-2.5` text pill |
| M3 | Settings sub-nav is an ad-hoc inline link (`text-sm`, `px-3 py-1.5` ≈ 31px target, non-token `text-white`/`bg-white`) instead of the segmented control used everywhere else | `src/app/(dash)/settings/page.tsx:23-26` | Use `segmented` / `segmented-item(-active)` classes (§4.7), matching `properties/[id]` |
| M4 | Every guest API call pays the middleware auth round trip (F2) — on a phone this is the single biggest chunk of chat latency | middleware | Fixed by step 1.1 |

Verified as already correct at 390px: tab bar 3-destination grid with
`pb-[env(safe-area-inset-bottom)]` and content `pb-24` clearance; guest chat
`h-[100dvh]` frame, 16px composer textarea, safe-area paddings, frosted
header/composer only, horizontal quick-reply scroller, typing dots + caret;
reservations = chip scroller + `lg`-only table with mobile cards; segmented
controls wrapped in `overflow-x-auto`; wizard inputs `h-14 text-[19px]`;
`CopyButton`/`icon-btn` are h-9 elsewhere. Note: TabBar has 3 destinations
(Today/Properties/Settings), not the 5 in DESIGN-PLAN §3.3 — that is the
intentional v2 nav (`SideNav.tsx:7-13`); plan §3.3 text predates it. Tap
targets in the tab bar (~44px) and quick-reply chips (h-9, per §3.14 spec) are
within plan.

---

## 5. Test plan

**Baseline first (before any change):** capture warm TTFBs so deltas are honest.

```powershell
# Guest endpoints (no cookies needed) — repeat 3x, take the median
curl.exe -s -o NUL -w "chat-page  ttfb=%{time_starttransfer} total=%{time_total}`n" https://APP_URL/chat/<token>
# Host pages: DevTools → Network → right-click the /dashboard document → "Copy as cURL",
# then run that with the -w flag above (carries the sb-* cookies). Record:
# /dashboard, /properties, /settings, /inbox, one /properties/[id], one /reservations/[id].
```

**Per fix:**

1. **Middleware (1.1):** host-page TTFB drops ~500–600ms warm; DevTools Network
   shows no ~250ms gap before the RSC fetch on navigations or prefetches.
   Correctness: signed-out `/dashboard` still redirects to `/login`; signing in
   with an expired (>1h old) session still works (wait 65 min, navigate — must
   not bounce to /login); `/api/chat/<token>/messages` returns 404 for a bogus
   token with no auth round trip in the logs.
2. **`cache()` (1.2):** `npm run build` passes; a dashboard render performs one
   `getUser` + one profiles query (count them in Supabase Logs → Auth/API);
   signed-out page renders redirect exactly as before.
3. **Chat POST (1.4/1.5):** with `AI_API_KEY` unset, POST a message and time it —
   target ≤2.5s cold / ≤1s warm (was ~6.4s); Supabase query log shows ≤4 queries
   for that request. Error contracts unchanged: empty message → 400, second
   message <8s → 429 `too_fast`, 61st/day → 429 `daily_limit`, dead link → 404,
   paused org → 402. Emergency keyword ("fire") still returns instantly with the
   KB block + escalation. With AI configured: first token arrives after ≤3 DB
   phases; reply + escalation + `lastMessageAt` still land post-stream; host sees
   the escalation with Inngest running (escalation email arrives even after the
   guest's response completed — proves `after()` works).
4. **Property limit (2):** with `STRIPE_SECRET_KEY` unset, add a 2nd and 3rd
   property from the phone — both succeed; event log shows
   `billing: "pre-launch-unlimited"`. Then set any non-empty
   `STRIPE_SECRET_KEY` in a **local/preview** env (never prod), restart, confirm
   the 2nd property at limit 1 is again refused with the upgrade message.
5. **Session audit (3):** phone + laptop sign-in drill — sign in on both with
   the same account; send a guest message from each device's browser; sign out
   on the phone → phone hits /login on next tap, laptop still works; repeat with
   laptop. Keep both idle >1h, then navigate on each — no forced sign-outs
   (proves per-device refresh). On mobile Safari: Google sign-in completes back
   to /dashboard or /onboarding; OTP code path completes; cookies are `Secure`,
   `HttpOnly`, `SameSite=Lax` in DevTools → Application.
6. **Mobile (4):** DevTools iPhone 12 Pro (390px, throttled CPU): tab bar
   visible with safe-area padding (add `viewport-fit=cover` then rotate a
   notched device — header/composer clear the notch); no horizontal overflow on
   any (dash) route (check especially reservations chips + table hidden,
   properties detail tabs, Today stat grid); every input ≥16px (focus the
   composer — Safari must not zoom); copy-chat-link and Settings sub-nav are
   ≥36px targets; guest chat: keyboard opens over nothing (composer stays
   visible), scroll stays pinned to bottom while streaming.

---

## 6. Implementation order (each step independent, with definition of done)

1. **Middleware** (`src/lib/supabase/middleware.ts`): `/api/` skip +
   `getSession()` decision + expiry-gated `getUser()` refresh.
   *Done when:* test 1 passes; `npm run build` clean.
2. **`requireOrgMember` cache** (`src/lib/auth.ts`): wrap in `cache()`, body
   unchanged. *Done when:* test 2 passes; every (dash) page/action still
   redirects/returns null when signed out.
3. **Callback session reuse** (`src/app/auth/callback/route.ts`): use
   `exchangeCodeForSession`'s result; `getUser()` only when no code.
   *Done when:* Google + OTP logins land on /dashboard or /onboarding; one fewer
   auth call per login in the logs.
4. **`loadGuestChatContext`** (`src/lib/tokens.ts` + `src/app/chat/[token]/page.tsx`):
   single-query context incl. billing. *Done when:* chat page renders in 1 query;
   expired/hold/cancelled tokens still 404; paused org still shows the notice.
5. **Chat POST restructure** (`src/app/api/chat/[token]/route.ts`): phases per
   §1.4, parallel batches, `after(sendEvent)`. *Done when:* test 3 passes in
   full (both fast-fail and AI paths).
6. **Poll single query** (`src/app/api/chat/[token]/messages/route.ts`).
   *Done when:* poll returns identical messages incl. `after=` cursor semantics;
   1 query per poll; host replies appear ≤15s.
7. **Pre-launch unlimited** (`src/app/actions/wizard-v2.ts`, optional
   `src/app/admin/page.tsx`). *Done when:* test 4 passes.
8. **Mobile fixes** (`src/app/layout.tsx`, `src/app/(dash)/inbox/[id]/page.tsx`,
   `src/app/(dash)/settings/page.tsx`). *Done when:* test 6 passes.

No migrations. No new dependencies. RLS, `getUser`-for-data, and token validation
are untouched throughout.
