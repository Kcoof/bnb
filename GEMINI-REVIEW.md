# GEMINI-REVIEW — design refresh vs DESIGN-GEMINI.md

Reviewed commit `897232f` ("Gemini design direction: warm linen palette…"). Method: WCAG 2.1 contrast math on every color pair actually used in markup, verification of compiled CSS in `.next/static/chunks/2vptwgav0ypqr.css`, full sweep for hard-coded hex, and string-matching check for the microcopy swaps. Review only — no code changed.

---

## CRITICAL

### C1. The serif display type is a silent no-op — headlines got lighter, not serif
`src/app/globals.css:87,92,97` declare `--text-display--font-family: var(--font-display)` (and headline/title-1), but **Tailwind v4.3.3 does not support a `--text-*--font-family` companion**. Only `--line-height`, `--letter-spacing`, and `--font-weight` companions are honored. Compiled proof (`2vptwgav0ypqr.css`):

```css
.text-display{font-size:clamp(...);line-height:...;letter-spacing:...;font-weight:var(--tw-font-weight,400)}
/* font-weight: yes. font-family: absent. Same for .text-headline, .text-title-1 */
```

Net effect: scope item (2) and directive change #3 ("Typographic Anchor") don't render at all — while the weight companion *did* apply, dropping every display/headline/title-1 heading from 600 → 400. All page h1s, the landing hero, and the dashboard greeting are now **thinner sans** than before the refresh. Worse than a no-op.

**Fix** (either):
- Add at the end of `globals.css`:
  ```css
  .text-display, .text-headline, .text-title-1 { font-family: var(--font-display); }
  ```
- Or add the `font-display` utility class (Tailwind generates it from the `--font-display` theme key) next to each usage.

Also note: `"Instrument Serif"` is referenced but never loaded — `layout.tsx` only loads Geist, so non-Apple devices fall through to Georgia (fine as a fallback, but load `Instrument_Serif` via `next/font/google` if the editorial look matters off-Apple).

### C2. `--sidebar-bg` is invalid CSS — desktop dashboard sidebar loses its background
`src/app/globals.css:30` — missing comma:

```css
--sidebar-bg: rgba(248, 246 241, 0.85);   /* ← invalid */
```

Emitted verbatim in the built CSS. When consumed by `bg-[var(--sidebar-bg)]` (`src/app/(dash)/layout.tsx:19`) it's invalid-at-computed-value-time → `background-color` collapses to transparent. Every desktop (md+) dashboard page renders the sidebar with only `backdrop-blur` and no linen tint — page content bleeds through under the nav text. Line 29 (`--nav-bg`) has the comma; line 30 doesn't.

**Fix:** `--sidebar-bg: rgba(248, 246, 241, 0.85);`

---

## MAJOR

### M1. Landing hero secondary line fails AA (regression)
`src/app/page.tsx:84` — `<span className="block text-ink-3">Available 24/7.</span>` inside the `text-display` hero. Sandstone `#9E9A93` on linen `#F8F6F1` = **2.59:1**, below the 3:1 large-text minimum. The old pair (`#86868b` on `#f5f5f7` = 3.33:1) passed — this swap broke it.
**Fix:** `text-ink-2` (5.60:1), or darken `--ink-3` (see MIN-1).

### M2. Leftover cold hard-coded colors clashing with the warm palette
All pass AA numerically, but each is a cold remnant the directive explicitly retires:
- `src/app/pricing/PlanPicker.tsx:45` — `text-[#6db2ff]` on the obsidian featured card. The landing twin was fixed to `#C9A87C` (`page.tsx:193,213`); `/pricing` wasn't. Same component pattern, two accents. **Fix:** `text-[#C9A87C]`.
- `src/app/onboarding/OnboardingWizard.tsx:222` — `accent-[#0071e3]` checkbox, the exact "iCloud Support" blue DESIGN-GEMINI.md §1 opens by condemning. **Fix:** `accent-accent` (utility exists via `--color-accent`).
- `src/components/StatusPill.tsx:10-11` — `text-[#0a62c0]` on `bg-accent-tint`; the tint is now warm limestone, so this is cold blue on warm stone (5.05:1). `StatusPill.tsx:14-15` — literal purple pair `bg-[#f0ebfd] text-[#5b3fbf]` (6.19:1). **Fix:** map `occupied`/`arrived` → `text-accent` (12.47:1 on limestone); give `cleaning`/`in_progress` a warm pair (e.g. success-tint/success, or a new clay tint) — `needs_cleaning` already owns amber.

### M3. Warm shadows were swapped in `:root` but not in `@theme inline` — utilities still ship the old cold ones
`src/app/globals.css:124-126` (`@theme inline`) still hold the pre-refresh values `0 1px 2px rgb(0 0 0/0.04), 0 4px 12px rgb(0 0 0/0.03)` etc., while `:root` (`globals.css:40-42`) got the new warm `rgba(25,24,22,…)` stops. Tailwind inlines theme values into utilities, and the built CSS confirms `.shadow-card` compiles to `#0000000a / #00000008` — cold black. Every `shadow-card/raised/float` in the app (cards, chat demo, pills) renders the old elevation; the "warm ambient shadows" claim (directive change #4) doesn't ship, and the two token definitions have silently diverged.
**Fix:** copy the three warm values into `@theme inline` (or delete the `:root` shadow block entirely to remove the duplicate). Note you can't point the theme keys at `var(--shadow-card)` — same name = circular.

### M4. "Publish Concierge" wizard CTA — claimed in scope, absent in code
No `Publish` string exists anywhere in `src/`. Final-step CTAs are "Get the QR card" (`OnboardingWizard.tsx:279`) and "Open printable card" (`PropertyWizard.tsx:102`). Directive §6.4's onboarding CTA was listed as implemented but isn't.
**Fix:** rename the final-step primary CTA to "Publish Concierge & Get QR Card" (both wizards), or drop it from the shipped-scope claim.

---

## MINOR

### MIN-1. `--ink-3` fails 4.5:1 at small sizes, everywhere it's used for real text
Sandstone on linen 2.59:1 / on white 2.80:1. Affected: landing footer + "Business+" note + step numbers (`page.tsx:144,232,240`), pricing footnotes (`pricing/page.tsx:46,57`), wizard step labels, field hints/`(optional)`, inbox timestamps, model attributions. This failed AA before the swap too (3.33–3.62:1) but is now ~25% worse, and the token comment ("placeholders, disabled, decorative only") doesn't match reality. Same token also drives `hover:border-ink-3` input/chip borders — now 2.80:1, under the 3:1 non-text minimum (old value passed).
**Fix:** darken `--ink-3` to ≈ `#757067` (4.55:1 on linen, 4.92:1 on white — clears both text and border minimums), or migrate the real-text usages to `ink-2`.

### MIN-2. Select chevron still the old cold ink
`src/app/globals.css:277` — SVG stroke `%236e6e73` (pre-refresh ink-2). **Fix:** `%2366625D`.

### MIN-3. `--line: #d2d2d7` untouched cool gray
Input strokes remain cold against the warm palette, and at 1.51:1 vs white they fail WCAG 1.4.11 (3:1 for component boundaries — pre-existing; inputs survive on their shadow/fill). Optional: warm to ≈ `#D8D3C9`.

### MIN-4. Serif breadth exceeds the directive's "strictly" list
Once C1 is fixed, `text-title-1` puts serif on every screen h1 — "Inbox", "Settings", "Admin", "Sign in to AUTOMI", "Pick your plan". Defensible under §3 ("main screen page titles") but wider than §2's strict list (property titles, greeting headers, print cards). Owner call; nothing breaks.

---

## Passing areas

- **Cypress pairs:** white on cypress buttons/badges 14.72:1; linen guest-bubble text on cypress 13.63:1; cypress `text-accent` on white/linen/limestone 14.72/13.63/12.47:1 — all AA.
- **Inks:** obsidian on linen/white/limestone 16.43/17.74/15.03:1; clay ink-2 on the same 5.60/6.05/5.13:1; ink on white concierge bubble 17.74:1 — pass.
- **Pricing accent:** `#C9A87C` on the featured card 7.92:1 (card is `bg-ink` obsidian, `page.tsx:188` / `PlanPicker.tsx:41` — not cypress as the scope note assumed; passes either way, 6.57:1 on cypress). `text-white/60` secondary text on ink 7.01:1 — pass.
- **Semantic pairs:** success 7.01:1, warning 4.87:1, danger 5.90:1 on their tints (StatusPill, feature tiles, dashboard escalation rows) — pass.
- **Terracotta:** absent from the codebase entirely (no `--accent-warmth` token, no `#C27E4B`) — parked cleanly; zero AA exposure as text.
- **Frosted bars:** `rgba(248,246,241,0.85)` + blur over white cards blends to ≈ `#F9F7F2` → ink 16.6:1, ink-2 5.7:1; also more opaque than the old 0.72 white nav, and the warm tint now separates bars from white cards better than white-on-white did. Pass.
- **Serif containment (leak check):** display/headline/title-1 classes appear only on h1/h2 elements; buttons, tabs, inputs, and chat body use `btn`/`input`/`bubble-*` classes with explicit sans sizing — no leak risk once C1 makes serif actually compile.
- **Bubble restyle:** cypress guest bubble + white concierge card with 18/4px tails, border, soft shadow (`globals.css:238-252`) — matches spec §3.2; landing demo card reuses them with only size/padding inline overrides (no hard-coded colors).
- **Microcopy regressions:** none. Repo has no tests/test script; nothing matches the retired strings ("checking with your host", "Everything looks good", "Let me check with your host"); both replacements in `route.ts` are the right strings at the right sites (fast-fail `route.ts:104`, empty-escalation `route.ts:381`); `schedule.ts:38` greeting's new `r.property.name` is covered by the full-row join select; no unused vars introduced.
- **Sections 4–5 parked cleanly, not half-built:** chat header is the pre-existing bot + "online 24/7" (no orphaned co-branding/microcard/pacing fragments); landing has no half-rendered simulator, trust, or ROI widgets; dashboard quiet-state copy (`dashboard/page.tsx:125`) and 3AM hero (`page.tsx:87`) read as complete thoughts.
- **Print card:** cream card face + print-safe grays (`card/page.tsx`) — intentionally untouched; correct.

---

## Verdict

**FIX FIRST** — the refresh's two headline changes don't actually render (serif never compiles, sidebar token is a typo'd invalid value), and until C1/C2 land this ships a weight regression on every heading and a transparent sidebar on every desktop dashboard page.
