# DESIGN-REVIEW — Apple-style UI/UX redesign vs DESIGN-PLAN.md

**Commit under review:** `c37dbbe` (diffed against `dfd3532`).
**Method:** full-commit diff scan filtered to non-`className` lines (§7 logic check), source grep for palette/emoji/input-size violations, re-ran `npm run build` (exit 0), and inspected the compiled CSS (`.next/static/chunks/0tqfilms00bbf.css`) to verify every §2 utility actually generates.

---

## CRITICAL

**None found.** Specifically:

- No route, link, form-action, server-action, or guard changes. `requireOrgMember()` guards, all `db.*` queries, and every action call (`changeStatusAction`, `hostReplyAction`, `cleanerDoneAction`, `signIn/signUp`, `signOutAction`, …) are byte-identical; the one apparent query change on the dashboard (`aiStats.select`) is a reformat of the same `{ conversationId: conversations.id }` selection.
- Poll interval untouched (15s, `ChatWidget.tsx:57`); SSE/stream loop untouched except the streaming bubble's key (`local-stream-<ts>` → constant `"local-stream"`), which is rendering-identity only; `maxLength={2000}` and Enter-to-send kept (the added `e.preventDefault()` is required now that the input is a textarea).
- Component APIs kept: `StatusPill({ status })` identical (+`sent`/`failed` mappings, same fallback); `CopyButton({ text, label, className })` identical.
- `package.json` / lockfile untouched in the commit (no new packages); zero `dark:` utilities; font stack is system-first + the already-hosted Geist vars (no SF self-hosting).
- Print isolation intact: `#card` id, `body *{visibility:hidden}` trick, `.no-print` all preserved, with the planned additions (`print-color-adjust: exact`, `@page { margin: 12mm }`, `border-color: transparent`).

---

## MAJOR

### M1. Step 9 (+ slices of 10) was not finished — legacy slate/stone/amber/emerald styling and emoji chrome remain on ~14 files

The redesign is visually half-applied: inputs and submit buttons inside several forms were converted, but their containers, secondary buttons, status text, and in one case a whole transcript section still carry the old palette. These screens render as a jarring mix of the two design systems, violating the plan's ground rule ("Every color… must come from a token"), §1.2 ("The current amber/stone brand accents disappear from screens"), and §2.4 (no emoji in UI chrome).

- `src/app/(dash)/reservations/[id]/page.tsx:186-205` — conversation transcript still `bg-slate-100` / `bg-blue-100` / `bg-amber-50` / `bg-emerald-50` bubbles with the `text-[10px] uppercase` role label and `⚠ escalated` emoji. §3.10 explicitly says "bubbles exactly as §3.6" (bubble-in/out/note + non-uppercase caption). Also `text-sm`/`text-xs` body text at :73, :79, :91, :98, :104, :115, :141, :148, :161-167.
- `src/app/(dash)/properties/[id]/PropertyDetailsForm.tsx:50-79` and `KnowledgeForm.tsx:64-126` — slate-300 inputs, slate-900 submit, `text-emerald-700 "Saved ✓"`.
- `src/app/(dash)/properties/[id]/TestQuestionForm.tsx:38-52` — slate input/button, `bg-amber-50` escalation bubble (§3.11 wanted the mini-chat with `.input` + bubble classes).
- `src/app/(dash)/properties/[id]/IcsPanel.tsx:48,74,86` — slate card/button, `bg-amber-50` error.
- `src/app/(dash)/properties/[id]/page.tsx:69-74` — `📇 Concierge QR card` stone-300 pill; §3.11 explicitly says "qr icon, drop 📇".
- `src/app/(dash)/settings/page.tsx:24`, `settings/templates/page.tsx:29`, `settings/team/page.tsx:23,33` — `bg-slate-900` heading chips, `bg-slate-100` role badge.
- `src/app/(dash)/settings/OrgSettingsForm.tsx:34`, `reservations/NewReservationForm.tsx:47-48`, `settings/team/InviteForm.tsx:31-32`, `tasks/CleanerPanel.tsx:28,31`, `tasks/AdHocTaskForm.tsx:30`, `settings/templates/TemplateEditor.tsx:24,26,28,82,88` — `border-slate-200 bg-white` containers, slate-900 headings/buttons, emerald status text (the inputs inside these forms *were* converted — the containers were not).
- Print-card page chrome: `card/PrintButton.tsx:7` (stone-900 pill, no `.btn` base, no printer icon — §3.13 specified "primary pill sm with printer icon"), `card/page.tsx:27` (`text-slate-500`), `card/page.tsx:79` (`text-stone-400` helper caption — §3.13 specified `text-footnote text-ink-3` and itself notes the old stone-400 fails AA).

**Fix:** finish the step-9 pass file by file — containers → `.card`, inputs → `.input`, buttons → `btn btn-*` variants, transcript → `.bubble-in/.bubble-out/.bubble-note` with caption labels, replace `📇`/`⚠` with `Icon` (`qr`, `alert`), delete the slate-900 heading chips in favor of `text-title-*`.

### M2. Form controls rendered below 16px — violates §4.2's "Never render inputs below 16px" (iOS Safari focus-zoom)

- `src/app/(dash)/tasks/TaskRowActions.tsx:33` — cleaner `<select>` at `text-[13px]` (overrides the `.input` 16px).
- `src/app/(dash)/tasks/CleanerPanel.tsx:45,49,53` and `tasks/AdHocTaskForm.tsx:33,43,54` — inline inputs/selects deliberately downsized to `text-[14px]`.
- Plus the unrestyled legacy inputs still at `text-sm` (14px): `KnowledgeForm.tsx:64,73,101,111`, `PropertyDetailsForm.tsx:50-70`, `TestQuestionForm.tsx:38`, `AdHocTaskForm.tsx:58` (this one sits in a form whose other controls *were* restyled — inconsistent within the same card).

**Why it matters:** iOS Safari zooms the viewport when a `<16px` control receives focus, which breaks the glove-friendly cleaner/tasks flows on phones; it's also an explicit plan acceptance criterion (§1.10, §4.2).
**Fix:** keep `.input`'s `text-[16px]` everywhere and achieve compactness via height/padding only (`h-8/h-9 px-2.5`), never via font-size.

---

## MINOR

1. **No `loading.tsx` anywhere** (§3.16 asks for `(dash)` skeletons + guest-chat bubble skeletons). Route transitions flash empty. Fix: add a small server `loading.tsx` per §4.11 using the existing `.skeleton` class.
2. **Status menu has no mobile variant** — `board/StatusChangeMenu.tsx:65-82` renders the desktop popover at all widths; §3.7 says the same options render as a bottom sheet (`§4.8`) below `md`. On a 390px screen a 220px `absolute end-0` menu anchored inside a card is cramped. Fix: reuse the TabBar "More" sheet pattern under `md:hidden`/`md:` twins.
3. **Composer auto-grow not implemented** — `chat/[token]/ChatWidget.tsx` and `inbox/[id]/HostComposer.tsx` use `rows` + `min-h/max-h` only, so multi-line input scrolls internally instead of growing (§3.6/§3.14 "auto-growing textarea"). Fix: add `field-sizing: content` to the textarea classes (native, no JS) with the `max-h` cap already in place.
4. **Guest-chat initial-load shimmer missing** — §3.14 "initial load: 3 shimmer bubbles" is not implemented; the list is simply empty until the first fetch resolves.
5. **Focus-visible ring only on `.btn`/`.icon-btn`** — SideNav/TabBar links, `.list-row`, `.segmented-item`, quick-reply chips, reservation filter chips, and wizard type chips have no `focus-visible` styles and fall back to the UA outline. Keyboard users do get *an* indicator, but the QA checklist ("visible `outline-2` ring on every interactive element") isn't met uniformly. Fix: one global rule in `globals.css` (`a:focus-visible, button:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }`) or add the utilities to the shared classes.
6. **Copy drift beyond the plan's sanctioned replacements:** `board/page.tsx:35` + `properties/page.tsx:35` ("Set up your first concierge in about 5 minutes." replaces existing empty-state copy), `TaskRowActions.tsx:36` ("assign cleaner…" → "assign…"), `not-found.tsx` link text "bnb-ops" → "AUTOMI" (§3.16 said keep "bnb-ops"). Each is trivial but the ground rule is "copy stays unless this document says replace." Revert or get them sanctioned.
7. **Fragile `@theme inline` self-references** — `globals.css:114-131` maps `--radius-sm: var(--radius-sm)` etc. (same-name theme→root cycle). Verified working today: the compiled CSS emits the cyclic vars inside `@layer theme` while the author's unlayered `:root` literals win the cascade, so `rounded-*`/`shadow-*`/`ease-*`/`backdrop-blur-nav` all resolve correctly. But wrapping the author `:root` in any `@layer`, or a future Tailwind emitting theme vars unlayered, would silently zero every radius/shadow/easing. Fix: rename the theme keys (`--radius-card: var(--radius-lg)` style) or inline literal values in `@theme`.
8. **Small spec deltas:** dead export `useActiveNav` (`SideNav.tsx:56-60`); cleaner page renders StatusPill at the default 12px (§3.15 asked 14px for that page); §3.6's 28px bot avatar on assistant bubbles omitted; task due-chips mark *future* dates amber ("Due …") where §3.8 reserved warning for Today and `surface-2` otherwise (`tasks/page.tsx:47`).

---

## Confirmed passing

- **§7 logic freeze** — see CRITICAL section; zero functional diffs found across all 44 changed files.
- **Tailwind v4 token wiring** — compiled CSS contains `.rounded-lg{border-radius:var(--radius-lg)}`, `.shadow-card`, `.backdrop-blur-nav{…blur(var(--blur-nav))…}`, `.ease-spring`, `.animate-msg-in/.fade-up/.pop-in/.sheet-up/.toast-in/.typing`, `.text-display` (with weight/tracking companions), `.bg-canvas/.bg-accent-tint/.border-hairline`, and all `.btn-*`/`.segmented-*`/`.input` component classes; build exits 0 with no unknown-utility warnings; all keyframes + the `prefers-reduced-motion` block are in the output.
- **`btn`/variant pairing** — all 34 static + 3 template-literal `btn-*` usages include the base `btn` class.
- **Token hexes** — outside `globals.css` only the plan-sanctioned ones appear: StatusPill's §2.3 hexes (`#0a62c0`, `#5b3fbf`, `#f0ebfd`), landing `#6db2ff`, cleaner `#136c34`, dashboard hover `#fbdede`, and the print-card palette.
- **Guest chat (§3.14)** — `h-[100dvh]` frame, exactly 2 blurred surfaces (header + composer), grouping via stable-keyed `!mt-0.5` (compiles to `!important` — verified), `animate-msg-in` does not replay on 15s poll re-renders (keys are stable `createdAt`s), typing dots → streamed text with `streaming-caret`, Enter-to-send + `maxLength` + disabled logic intact.
- **Mobile shell (§3.3)** — sidebar `md:flex` only; TabBar + More sheet `md:hidden`; sign-out reachable from both (sidebar form and sheet form both call `signOutAction`); content `pb-24` clears the bar.
- **Print card (§3.13)** — `#card` + print isolation intact, `print-color-adjust: exact`, `@page 12mm`, on-screen-only border neutralized under print; cream-card pairs pass AA (`#1d1d1f` ≈15:1, `#6e6e73` ≈4.6:1 on `#faf7f2`).
- **Screens per spec** — landing (frosted nav, display hero + kicker, staggered fades, featured pricing card), login, wizard (segmented progress, keyed step fade, chips, finish screen with check + QR + two pills), Today, Inbox list + conversation, Board, Tasks, Reservations list (chips + `lg` table + mobile list-cards), Properties list, not-found, cleaner page.

---

## Verdict

**FIX FIRST** — the redesign is functionally safe (zero §7 violations, all tokens compile) but visibly unfinished: M1's ~14 half-restyled files and M2's sub-16px inputs break the plan's own hard rules on screens users touch daily, so finish step 9 before shipping.
