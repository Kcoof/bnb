# AUTOMI v2 — Build Spec Review

Reviewed commit `b25af5e` ("AUTOMI v2 per full build spec") against the AUTOMI FULL BUILD SPEC (§1–§13 condensed). Review only — no code changed. Build/lint pass is taken as given. Line numbers are as of this commit.

---

## CRITICAL

### C1. The QR entry point `/q/[token]` is not public — anonymous guests get bounced to the host login
- **Where:** `src/lib/supabase/middleware.ts:41-52`
- **Why:** `updateSession` redirects every unauthenticated request to `/login` unless the path is `/`, `/login`, `/chat/*`, `/c/*`, or `/api/*`. `/q/*` is missing from that list. The printed QR (`src/lib/mail.ts:30-32`) encodes `/q/{conciergeToken}` — a guest who scans it in the room is **not** signed in, so middleware 307s them to the host login page before the resolver ever runs. This breaks the product's front door in any deployment where Supabase is configured (it only "works" today because dev runs with the middleware pass-through at `middleware.ts:9-11`). It also partially masks every other `/q/` defect below, because the resolver is rarely reached unauthenticated.
- **Fix:** Add `!request.nextUrl.pathname.startsWith("/q/")` to the public-path guard in `src/lib/supabase/middleware.ts:44-47`.

### C2. The primary "Add property" flow uses the v1 wizard with **no plan-limit or billing check** — §13 enforcement is bypassable from the main UI
- **Where:** `src/app/(dash)/properties/page.tsx:22-24` (Add property → `/properties/new`) → `src/app/(dash)/properties/new/PropertyWizard.tsx:45` (v1 5-step form: Property / Arrival / Guest information / Recommendations / Emergency) → `src/app/actions/wizard.ts:44-119` (`createPropertyWizardAction` — inserts a property with **zero** reference to `subscriptions`, count, or `propertyLimit`).
- **Why:** Spec §13 requires `property_limit` enforcement **on add**, and §2 requires adds to run through the v2 wizard ("second property repeats from step 2"). The v2 wizard (`wizard-v2.ts:25-99`) does enforce the limit — but it only lives at `/onboarding`, used for the *first* property. Every subsequent property (the exact case §13 targets) goes through the v1 path: unlimited free properties, no Maps-link resolution, no appliance templates, no amenities chips. Two divergent wizards, and the surfaced one is the wrong one.
- **Fix:** Route `/properties/new` through the v2 wizard (starting at the property-name step for orgs that already have ≥1 property), delete the v1 `PropertyWizard` + `createPropertyWizardAction`, or port the limit/billing check into `createPropertyWizardAction` if the v1 form is kept.

---

## MAJOR

### M1. QR resolver ignores the token window for upcoming stays and reservation status → dead QR between stays
- **Where:** `src/app/q/[token]/route.ts:31-69`
- **Why:** Two problems in the cascade.
  1. The "upcoming" branch (lines 52-69) picks the next stay with `checkIn >= today` with **no lower bound of `checkIn − TOKEN_PRE_DAYS`**. A stay starting >3 days out wins over the concierge fallback, redirects to its `chatToken`, and `validateGuestToken` (`src/lib/tokens.ts:58`) rejects it because the window hasn't opened → guest sees the 404 "link no longer active" page. The printed card promises "works forever" (`card/page.tsx:81`) but is dead for any gap longer than 3 days.
  2. Neither the covering nor the upcoming query filters `status != 'cancelled'`. This is mostly survivable today only because ICS cancellation nulls `chatToken` (`src/lib/ics.ts:129,197`) — but the covering query `.limit(1)` can select a cancelled (null-token) row and skip a valid second covering stay, and any future code path that cancels without nulling the token (there is no manual cancel action; if one is added) turns the QR into a hard 404.
- **Fix:** Filter `ne(reservations.status, "cancelled")` in both queries, add `lte(reservations.checkIn, addDays(today, TOKEN_PRE_DAYS))` to the upcoming branch, and order the covering query deterministically.

### M2. Org bootstrap race on concurrent first logins — no transaction, no conflict handling
- **Where:** `src/app/actions/auth.ts:13-49` (`ensureOrgForUser`), called from `src/app/auth/callback/route.ts:32-33`.
- **Why:** Classic select-then-insert: `profiles` lookup → insert `organizations` → insert `profiles`. Two concurrent first logins for the same user (OAuth callback double-fire, OTP verify + lingering tab, retry) race between the select and the insert. Loser gets a PK violation on `profiles.id` → 500, **and the already-inserted org row is orphaned**. On the next attempt the profile still doesn't exist, so *another* org is created — orphan orgs accumulate and the user may be permanently unable to complete login. There is also no unique constraint on `profiles.email` to catch cross-user duplicates.
- **Fix:** Wrap in a transaction: `insert ... on conflict (id) do nothing` into `profiles`, and only create the org if the profile insert returned a row (or insert the profile with a generated org id in one transaction and roll back on conflict). Add a `unique` on `profiles.email` if one user = one org is intended.

### M3. `appliance_templates` is never seeded — the appliance step renders empty and §6 troubleshooting scripts are unreachable
- **Where:** Table created empty at `drizzle/0003_automi-v2.sql:1-9`; read at `src/app/onboarding/page.tsx:10-13` and `src/app/actions/wizard-v2.ts:193`; **no seed script, migration INSERT, or docs anywhere** (grep across `src/`, `scripts/`, `drizzle/`, `README.md`, `DB.txt` finds zero inserts).
- **Why:** Spec §2 step 7 is "appliance tick-boxes from templates" and §6 builds escalation on "structured per-appliance script". On a fresh deployment the wizard's "Which of these do you have?" screen lists nothing, no `property_appliances` rows can ever be created, and the prompt's `APPLIANCES & TROUBLESHOOTING` block is always "(none documented)" — which per §6 means *everything* escalates immediately.
- **Fix:** Add a seed (`scripts/seed-templates.mjs` or an idempotent `0004` migration) with the smart_tv / chromecast / apple_tv / projector / other rows including `default_troubleshooting`, and document it in the README.

### M4. Host edits to appliance how-tos are silently ignored — the only editable appliance field is dead, and copied templates can't be edited at all
- **Where:** `src/app/(dash)/properties/[id]/KnowledgeForm.tsx:15` still exposes "Appliances & how-tos" writing `kb.appliances`, but the v2 system prompt (`src/lib/ai/prompt.ts:21-45, 101-108`) **never reads `kb.appliances`** — it reads `property_appliances` exclusively. There is **no UI anywhere** that edits `property_appliances` or `custom_faqs` after the wizard (grep: only `prompt.ts` and `wizard-v2.ts` touch them).
- **Why:** The wizard tells hosts "We'll write the how-tos for you — **you can edit them anytime**" (`OnboardingWizard.tsx:202`). They can't. Worse, a host who *does* use the KB form's appliance field is typing into a void — the AI will never see it. §5 (deterministic facts from DB) and §6 (host-maintained scripts) are both broken for post-wizard edits.
- **Fix:** Add a property Appliances editor (and FAQ editor) under the property's KB tab backed by `property_appliances` / `custom_faqs`, and remove the dead `kb.appliances` field from `KnowledgeForm`.

### M5. "Pay before onboarding" (§13) is not enforced — new users onboard with no subscription, and the landing sells a trial that doesn't exist
- **Where:** `src/app/auth/callback/route.ts:38` routes no-property users straight to `/onboarding`; `src/app/actions/wizard-v2.ts:46-49` treats "no subscription row" as limit 1 / billing OK; `src/app/page.tsx:91,227` says "Start Free Trial" while `/api/stripe/checkout/route.ts:45-55` creates a plain subscription (no `trial_period_days`).
- **Why:** The intended flow (`/pricing` → checkout → `/billing/success` → `/onboarding`) exists but nothing gates it: a fresh login lands on onboarding and can create a live property + QR with zero payment setup. Pre-launch (Stripe unconfigured) that's a reasonable *dev* posture — but the code can't distinguish "Stripe configured, user skipped payment" from "pre-launch". The "Start Free Trial" CTA is a claim the product doesn't implement.
- **Fix:** When `STRIPE_SECRET_KEY` is set, gate `/onboarding` + `wizardStartAction` on an active/trialing/past_due subscription (redirect to `/pricing`); keep the current permissive behavior only when Stripe is unconfigured. Either add `trial_period_days` to the checkout session or change the CTA copy.

### M6. Team accounts are surfaced in Settings — §11 explicitly excludes them from this version
- **Where:** `src/app/(dash)/settings/page.tsx:25` links `/settings/team`; `src/app/(dash)/settings/team/page.tsx` (roster + `InviteForm`); `src/app/actions/settings.ts:34-58` (`inviteStaffAction` — live Supabase admin invite).
- **Why:** §11: "team accounts" are NOT in this version, and §3 allows only Today/Properties/Settings as sections. The Team page isn't a v1 relic linked from nowhere — it's one click from the default Settings screen, and inviting staff actually provisions auth users. This is scope the owner deliberately cut.
- **Fix:** Remove the Team link + page + `inviteStaffAction`/`removeStaffAction` (or gate behind a feature flag). The `/settings/templates` email-templates tab (`settings/page.tsx:26`) is a softer version of the same leftover — see R3.

### M7. The concierge fallback is one permanent, shared conversation — guests see previous guests' transcripts
- **Where:** `src/lib/tokens.ts:52` (`isConcierge` bypasses the expiry window entirely), `src/app/actions/wizard-v2.ts:70-86` (one evergreen synthetic stay per property), `src/app/api/chat/[token]/messages/route.ts:36-50` (returns the **full** message history for the token).
- **Why:** Between stays (or at properties with no bookings), every QR scan lands in the same `cnc_` thread. The next scanner — a new guest, a cleaner, anyone who photographs the card — reads the previous guest's messages and the host's replies. The permanent-QR → expiring-token design in §7 is honored for *booked* stays, but the fallback makes the QR a de-facto permanent live chat with a public, accumulating history. Cross-guest data exposure (names, requests, host notes) at DB level.
- **Fix:** Either rotate the `cnc_` conversation (new conversation per scan window / on first message after N hours of silence), or serve an empty transcript to each new scanner (e.g., only return messages created after the current guest's first message) while keeping the full history for the host inbox.

### M8. An escalation the model requests alongside `nearby_search` is silently dropped
- **Where:** `src/app/api/chat/[token]/route.ts:264-266` — `toolCalls.clear()` before pass 2 wipes **all** pass-1 tool calls, then `parseEscalation()` (line 309) only inspects what pass 2 produced.
- **Why:** If the model calls `escalate_to_host` and `nearby_search` in the same pass-1 response (plausible: "the AC is broken, also is there a restaurant nearby"), the escalation args are discarded. The assistant text may well have told the guest "I've notified your host" — but no escalation row is created and **no SMS is sent** (the SMS fires off the `escalation/created` event, `route.ts:339-356` + `events.ts:91-106`). A host-invisible dropped escalation is the worst silent failure this system has.
- **Fix:** Parse escalations from pass 1 *before* clearing the map (or don't clear — merge by tool-call id), and check for `escalate_to_host` across both passes.

---

## MINOR

- **M9 · Second property doesn't "repeat from step 2" (§2).** `OnboardingWizard` always opens on the welcome screen; the `propertyCount` prop is passed in (`onboarding/page.tsx:21`) but never read (`OnboardingWizard.tsx:23`). Fix: `useState(propertyCount > 0 ? 1 : 0)` and skip the welcome copy. (Compounded by C2 — the second-property flow isn't even this wizard.)
- **M10 · Legacy password mode is advertised on the login screen.** `src/app/login/page.tsx:111-116` — "Have an old password? Use it instead" is shown to everyone, including new users. §1 says no passwords for new users; the fallback action is fine, the visible affordance isn't. Gate the link on an env flag or remove it once the pre-launch account is migrated.
- **M11 · Sanctioned deep link leaks v1 surfaces.** `src/app/(dash)/inbox/[id]/page.tsx:61-69` links "‹ Inbox" (the unsanctioned inbox index) and `/reservations/{id}` (reservations UI, §11). Deep-linked `/inbox/[id]` is sanctioned; its outbound links should stay inside the conversation (or link back to Today).
- **M12 · Dead code in the prompt builder.** `src/lib/ai/prompt.ts:31` (`add("Check-out time", undefined)` — no-op) and `:127` (ternary with identical branches). Harmless but confusing; the checkout-time line at `:173` is the real one.
- **M13 · Maps link parsing misses common Google place-URL shapes.** `src/lib/maps.ts:10-11` handles `@lat,lng` and `?q=lat,lng` only; `/maps/place/…/data=!3d52.52!4d13.40` links (very common share output) fail → wizard shows "couldn't read coordinates" and `latitude/longitude` stay null, which silently degrades all nearby search to `NO_LOCATION` → escalate. Also the 2-hop loop at `:43-57` is redundant with `redirect: "follow"` (`res.url` is already final).
- **M14 · Deselecting an appliance deletes the host's edited copy.** `src/app/actions/wizard-v2.ts:213-227` — re-select never overwrites edits (good), but un-ticking deletes the row unconditionally (the comment admits it). With M4 fixed (an editor exists), delete-on-deselect will destroy real content. Only delete rows whose text still equals the template.
- **M15 · Webhook fabricates `current_period_end`.** `src/app/api/stripe/webhook/route.ts:44` falls back to `now + 30d` when the item lacks the field — that's hand-built period math, the thing §13 forbids, and it interacts badly with the past_due grace (`plans.ts:43-48`: cutoff = period end + 7d ⇒ ~37 days of live chat on a failing subscription). Persist `null` and treat "no period info" explicitly in `chatEnabledForOrg` instead.
- **M16 · Paused-chat (402) renders as a generic error mid-conversation.** `src/app/chat/[token]/ChatWidget.tsx:94-96` maps every non-404 failure to "Something went wrong". A guest messaging during a failed-payment pause should see the paused copy from `chat/[token]/page.tsx:21-32`, not a retry loop.
- **M17 · §8 `QRCode` table doesn't exist as a table.** QR state is folded into `properties.conciergeToken` + `reservations.chatToken` (`schema.ts:137,189`). Functionally equivalent and documented in comments — record it as an accepted deviation from the spec's data model so it doesn't get "fixed" later into a redundant table.
- **M18 · §12 conversation status is derived, not stored.** `conversations` (`schema.ts:205-221`) has no status column; resolved/escalated is computed from `escalations.status` per conversation (`conversations.ts:46-54`). Queryable at DB level, but every consumer must join; a generated column or a `status` field kept in sync on escalation create/resolve would match the spec letter.
- **M19 · Timezone approximations.** Dashboard greeting/today use the org's *first* property's timezone (`dashboard/page.tsx:25-26`) — wrong for multi-tz orgs; the `/q/` resolver compares date-only strings against UTC "today" (`q/[token]/route.ts:28`) while stays are property-local dates (`ics.ts:33-36` does it right) — QR can flip stays a day early/late near midnight.
- **M20 · Limit check is count-then-insert (TOCTOU).** `wizard-v2.ts:40-49` — two concurrent `wizardStartAction` calls both pass the count check. Enforce with a serializable transaction or a deferrable constraint if this ever matters in anger.
- **M21 · Checkout doesn't prevent stacking subscriptions.** `api/stripe/checkout/route.ts:45-55` happily creates a second session for an org with an `active` subscription (upsert on `orgId` then swaps the mirror, but Stripe keeps billing both). Disable plan buttons when `sub.status === "active"` and use Stripe's portal for changes.
- **M22 · Unmapped price silently downgrades the mirror.** `webhook/route.ts:36-37` — if `STRIPE_PRICE_*` envs drift from the actual price paid, `planFor()` returns null and a Business customer is recorded as Starter (limit 3). Log/flag unknown price ids loudly rather than defaulting.
- **M23 · No third pass if pass 2 calls `nearby_search` again.** `api/chat/[token]/route.ts:306` — a second nearby call is unhandled; the tool call dangles and only pass-2 text is persisted. Cap iterations explicitly and treat a repeat call as a no-results answer.

---

## Passing areas (one-liners)

- **§1 Auth:** Google OAuth primary with PKCE code exchange (`auth/callback/route.ts:12-20`), email OTP verify-and-sign-in in one step (`actions/auth.ts:83-95`), no SMS login, `shouldCreateUser` on OTP ✓ (password leftovers: M10).
- **§2 Wizard content & order:** 10 steps in exact spec order, one question per screen, dots, 400ms autosave, back preserves state, server-side short-link resolution with 2-hop redirect + timeout ✓ (gaps: M3, M9, C2).
- **§3 Dashboard:** greeting, open-escalation cards with Reply (sanctioned deep link), property cards with concierge status, arrivals/departures/monthly-conversation stats; nav is exactly Today/Properties/Settings on desktop and mobile ✓ (leaks: M6, M11).
- **§4 Guest chat:** instant open, greeting uses host-chosen assistant name + human tone (`schedule.ts:38`), quick replies incl. "I need help", mobile-first layout, 16px composer ✓.
- **§5 Answers:** prompt hard-scopes the model to PROPERTY DATA/FAQ/host messages ("NEVER change/embellish/fill gaps"), nearby only from live Places results with explicit no-invent fallback, missing → escalate ✓ (`prompt.ts:146-160`, `client.ts:21-38`).
- **§6 Escalation:** troubleshoot-first script per appliance with "only if the guest says it's STILL not working" gate, no-script → immediate escalate; SMS primary via `escalation/created` → `sendSms` (owner email rides along); emergency fast-path skips the model entirely, shows emergency info + immediate high-urgency alert ✓ (`prompt.ts:153-163`, `route.ts:126-183`, `events.ts:91-106`) — modulo M3/M4/M8.
- **§7 Reservations/tokens:** internal-only, tokens are 32-byte urlsafe secrets, `check-in−3d → check-out+2d` + status window enforced on every read, QR carries a resolver token, not a chat token; token rotation exists ✓ (resolver defects: M1, M7; C1 blocks the route entirely).
- **§8 Data model:** all listed entities present (QRCode folded into columns — M17; Users = Supabase auth.users + `profiles`); RLS extended to all v2 tables with org-scoped policies (`0002_rls.sql:167-193`) ✓.
- **§9/§10 (env-gated graceful degradation):** no Places key → `NO_RESULTS` → escalate with honest copy; no Twilio → SMS logged `skipped`, owner email still fires, escalation still lands on Today; no Stripe → checkout 503s with a UI notice, limit treated as 1; no ADMIN_EMAILS → `/admin` renders "Not found" for everyone. All four behave sanely unconfigured ✓.
- **§12:** every escalation has open/resolved with resolver + timestamp; host reply auto-resolves ✓ (storage shape: M18).
- **§13 (billing mechanics where implemented):** webhook signature verified via `constructEventAsync` before any write, Stripe v23 `items[0].current_period_end` shape read correctly (stripe ^23), upsert conflict target `orgId` matches the unique index, `past_due` keeps chat live during retries then pauses, `/admin` is auth-gated, email allow-listed, plain table, unlinked ✓ (gaps: C2, M5, M15, M21, M22).
- **Rate limiting & abuse:** 8s/24h/2000-char limits keyed to guest-role messages, enforced server-side ✓.
- **Org isolation:** every host action/page scopes by `orgId`; guest/cleaner paths are token-gated with 404-not-403 responses; no cross-org enumeration path found in `/q/`, `/chat/`, or `/c/` ✓.

---

## Verdict

**FIX FIRST** — the QR is the product's front door and today it redirects anonymous guests to the host login (C1), while the main add-property flow bypasses both the v2 wizard and every plan limit (C2); everything else is real but repairable without re-architecture.
