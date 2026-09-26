# AUTOMI — Apple-style UI/UX Redesign Plan

**Scope:** a visual/UX layer across every existing screen. No route, data, or logic changes.
No new dependencies (no component libraries, no animation libraries, no fonts to download).
Tailwind CSS v4, CSS-first config. Light mode only (see §2.6 for why, and how a dark pass
stays cheap later).

**Ground rules for the implementer**

- Server components stay server components. New interactive UI (mobile tab bar, menus,
  sheets) is added as small leaf client components — never by converting pages.
- Every color, radius, shadow, easing used anywhere must come from a token in
  `globals.css`. No ad-hoc hexes in pages except the print card and the status-pill table
  (both specified below).
- All existing copy, links, forms, actions, and polling behavior stay exactly as they are
  unless this document says "replace copy" for a specific string.
- WCAG AA and `prefers-reduced-motion` are acceptance criteria, not nice-to-haves.

---

## 1. What Apple's design language actually is (and how it maps here)

Not a clone of apple.com's marketing pages — the *system* behind them, applied to a SaaS
ops product. Ten principles, each with the concrete rule for this repo:

1. **Typography carries the design.** Huge headlines (up to 80px on the landing hero) at
   weight 600 with tight negative tracking (−0.02em to −0.035em, tighter as size grows).
   Body text is 17px — larger than typical SaaS (14px) — which is where the "airy,
   confident" feel comes from. Never use weight 700 anywhere except tiny logo marks.
2. **A near-monochrome canvas.** `#f5f5f7` gray canvas, white surfaces, `#1d1d1f` ink,
   `#6e6e73` secondary text. Color is *meaning*, not decoration: exactly one brand accent
   (Apple blue `#0071e3`) plus functional green/amber/red. The current amber/stone brand
   accents disappear from screens; warmth survives only in the printed QR card (§3.12).
3. **Generous, rhythmic whitespace.** Landing sections breathe at 96–140px vertical
   padding; dashboard content sits in one centered ≤1024px column with 40px page padding;
   cards pad 20–24px; lists pad 16–20px per row. Whitespace is the separator — the more
   whitespace, the fewer borders you need.
4. **One restrained accent.** Apple blue `#0071e3` (hover `#0077ed`) for primary actions,
   links, focus, and the guest's own chat bubbles — nothing else. No blue headings, no
   blue icons where gray will do.
5. **Pill CTAs.** Every primary/secondary action is a fully-rounded (`rounded-full`)
   button, h-44px standard, h-36px compact, h-52px landing hero. Text 15–17px, weight 500.
6. **Continuous-corner feel.** Large radii everywhere: 10px chips/inputs, 20px cards,
   28px hero/sheet surfaces, 22px chat bubbles with one 6px "tail" corner. Squares and
   4–8px radii read as "generic admin" — avoid.
7. **Frosted-glass translucency, used sparingly.** `backdrop-blur` + semi-transparent
   white is reserved for things that float over scrolling content: the landing nav, the
   dashboard sidebar, the mobile tab bar, chat header/composer, popovers. Cards and page
   content are opaque. Budget: ≤2 blurred surfaces per screen (guest phone performance).
8. **Hairline borders + soft diffuse shadows.** Separators are 1px `rgb(0 0 0 / 0.08)`,
   never darker than `#d2d2d7` for input strokes. Elevation is 1–2 large, very soft
   shadows (`0 4px 12px rgb(0 0 0 / 0.05)`), never tight dark shadows. Cards get
   border + faint shadow together.
9. **Motion that directs, never decorates.** Everything is a short ease-out
   (150–400ms): hover color/scale, press scale to 0.97, content fades up 12px on load,
   new chat bubbles pop in, skeletons shimmer. No bounce, no parallax, no scroll-jacking,
   no autoplaying hero video. CSS only — no JS animation library is needed or allowed.
10. **Mobile-first and accessible by default.** Guest chat and cleaner pages are designed
    at 390px first, then enhanced for desktop. Inputs are ≥16px font (prevents iOS Safari
    auto-zoom). Every interactive element has a visible focus ring and a ≥44px touch
    target. Contrast is AA (4.5:1 body, 3:1 large text) — the token palette below is
    pre-checked.

### 1.1 Fonts — the correct approach

Apple's San Francisco **cannot** be self-hosted or served legitimately on the web (the
SF font license covers Apple platforms only). The correct, Apple-endorsed pattern is a
**system-first stack**: on Apple devices the browser resolves `-apple-system` /
`BlinkMacSystemFont` to SF Pro, so Mac/iPhone guests see the real thing with zero bytes
downloaded. Everywhere else, fall back to **Geist** — already self-hosted in this repo via
`next/font` (`--font-geist-sans`), geometric and SF-like in proportions. No new font
dependency, no FOUT penalty beyond what Geist already costs.

The stack (token `--font-sans`, set in §2):

```css
-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display",
var(--font-geist-sans), "Segoe UI", "Helvetica Neue", Arial, sans-serif
```

Tracking/weight rules that produce the Apple feel regardless of which font renders:

- Display (≥40px): weight 600, tracking −0.03em to −0.035em, line-height 1.02–1.1.
- Page/section titles (19–28px): weight 600, tracking −0.01em to −0.02em.
- Body (15–17px): weight 400, tracking normal (Geist renders slightly wide; do not
  letter-space it), line-height 1.45–1.5.
- Buttons/nav/chips: weight 500.
- Uppercase micro-labels exist **only** on the print card; on screens, kickers are
  sentence-case 17–19px semibold accent text (replaces the current uppercase amber eyebrow).
- Keep `Geist_Mono` for URLs, tokens, template variables: `ui-monospace, "SF Mono",
  var(--font-geist-mono), Menlo, Consolas, monospace`.

Also: delete the `font-family: Arial…` line on `body` in the current `globals.css` (it
overrides the stack) and the `prefers-color-scheme: dark` block (§2.6).

---

## 2. Design tokens

Drop-in replacement for the token section of `src/app/globals.css`. Keep the existing
`@media print` block untouched. Keyframes + utility classes from §5 are appended after
this block.

```css
@import "tailwindcss";

:root {
  /* palette — light */
  --canvas: #f5f5f7;              /* app background */
  --surface: #ffffff;             /* cards, lists */
  --surface-2: #f0f0f2;           /* inset/well backgrounds, skeleton base */
  --ink: #1d1d1f;                 /* primary text — 16.1:1 on canvas */
  --ink-2: #6e6e73;               /* secondary text — 5.0:1 on canvas */
  --ink-3: #86868b;               /* placeholders, disabled, decorative only (3.8:1) */
  --hairline: rgb(0 0 0 / 0.08);  /* separators */
  --line: #d2d2d7;                /* input strokes */
  --accent: #0071e3;              /* Apple blue — white text 4.7:1 */
  --accent-hover: #0077ed;
  --accent-tint: #e8f1fd;         /* selected states, icon tiles */
  --success: #157f3d;             /* white text 5.1:1 */
  --success-tint: #e8f5ec;
  --warning: #92400e;             /* amber text — 7:1 on white */
  --warning-tint: #fdf2e3;
  --danger: #d70015;              /* white text 5.4:1 */
  --danger-hover: #b80013;
  --danger-tint: #fdebec;
  --focus: #0071e3;

  /* chat */
  --bubble-in: #e9e9eb;           /* received bubble, iOS Messages gray */

  /* materials */
  --nav-bg: rgb(255 255 255 / 0.72);   /* frosted light bars */
  --sidebar-bg: rgb(246 246 247 / 0.85);
  --overlay: rgb(0 0 0 / 0.32);

  /* radii */
  --radius-sm: 10px;   /* chips, menu items */
  --radius-md: 14px;   /* inputs, popovers, big buttons on mobile */
  --radius-lg: 20px;   /* cards, list containers */
  --radius-xl: 28px;   /* hero cards, wizard, sheets, chat demo */

  /* shadows — soft and diffuse only, 3 max */
  --shadow-card: 0 1px 2px rgb(0 0 0 / 0.04), 0 4px 12px rgb(0 0 0 / 0.03);
  --shadow-raised: 0 2px 6px rgb(0 0 0 / 0.05), 0 10px 28px rgb(0 0 0 / 0.07);
  --shadow-float: 0 4px 12px rgb(0 0 0 / 0.08), 0 24px 56px rgb(0 0 0 / 0.12);

  /* blur */
  --blur-nav: 20px;    /* nav / sidebar / tab bar / chat bars */
  --blur-overlay: 2px; /* dim layer behind sheets — optional */

  /* motion */
  --ease-out: cubic-bezier(0.25, 1, 0.5, 1);      /* hover, fades */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);  /* color, misc */
  --ease-spring: cubic-bezier(0.34, 1.3, 0.64, 1);/* bubbles, popovers — slight settle */
  --ease-sheet: cubic-bezier(0.32, 0.72, 0, 1);   /* Apple sheet slide */
}

@theme inline {
  /* colors → utilities: bg-canvas, bg-surface, text-ink, text-ink-2, border-hairline,
     bg-accent, text-success, ring-focus/30, … */
  --color-canvas: var(--canvas);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-ink: var(--ink);
  --color-ink-2: var(--ink-2);
  --color-ink-3: var(--ink-3);
  --color-hairline: var(--hairline);
  --color-line: var(--line);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-tint: var(--accent-tint);
  --color-success: var(--success);
  --color-success-tint: var(--success-tint);
  --color-warning: var(--warning);
  --color-warning-tint: var(--warning-tint);
  --color-danger: var(--danger);
  --color-danger-hover: var(--danger-hover);
  --color-danger-tint: var(--danger-tint);
  --color-focus: var(--focus);
  --color-bubble-in: var(--bubble-in);

  /* fonts */
  --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display",
    var(--font-geist-sans), "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, "SF Mono", var(--font-geist-mono), Menlo, Consolas, monospace;

  /* type scale → utilities: text-display, text-title-1, text-body, …
     (the --text-*--line-height / --letter-spacing / --font-weight companions
     make each step self-contained) */
  --text-display: clamp(2.75rem, 1.4rem + 6vw, 5rem);
  --text-display--line-height: 1.04;
  --text-display--letter-spacing: -0.035em;
  --text-display--font-weight: 600;
  --text-headline: clamp(2rem, 1.4rem + 2.4vw, 3rem);
  --text-headline--line-height: 1.1;
  --text-headline--letter-spacing: -0.03em;
  --text-headline--font-weight: 600;
  --text-title-1: 1.75rem;   /* 28 — page titles */
  --text-title-1--line-height: 1.15;
  --text-title-1--letter-spacing: -0.02em;
  --text-title-1--font-weight: 600;
  --text-title-2: 1.25rem;   /* 20 — card group titles */
  --text-title-2--line-height: 1.2;
  --text-title-2--letter-spacing: -0.015em;
  --text-title-2--font-weight: 600;
  --text-title-3: 1.1875rem; /* 19 — section h3 */
  --text-title-3--line-height: 1.3;
  --text-title-3--letter-spacing: -0.01em;
  --text-title-3--font-weight: 600;
  --text-body: 1.0625rem;    /* 17 — Apple body */
  --text-body--line-height: 1.5;
  --text-callout: 0.9375rem; /* 15 — list titles, buttons */
  --text-callout--line-height: 1.45;
  --text-footnote: 0.8125rem;/* 13 */
  --text-footnote--line-height: 1.4;
  --text-caption-1: 0.75rem; /* 12 */
  --text-caption-1--line-height: 1.35;
  --text-caption-2: 0.6875rem; /* 11 — print card micro-labels only */
  --text-caption-2--line-height: 1.3;

  /* radii → rounded-sm/md/lg/xl (replaces defaults deliberately) */
  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --radius-xl: var(--radius-xl);

  /* shadows → shadow-card, shadow-raised, shadow-float */
  --shadow-card: var(--shadow-card);
  --shadow-raised: var(--shadow-raised);
  --shadow-float: var(--shadow-float);

  /* blur → backdrop-blur-nav, backdrop-blur-overlay */
  --blur-nav: var(--blur-nav);
  --blur-overlay: var(--blur-overlay);

  /* easing → ease-out (overridden), ease-standard, ease-spring, ease-sheet */
  --ease-out: var(--ease-out);
  --ease-standard: var(--ease-standard);
  --ease-spring: var(--ease-spring);
  --ease-sheet: var(--ease-sheet);

  /* animations → animate-fade-up, animate-msg-in, animate-toast-in, … (§5) */
  --animate-fade-up: fade-up 0.4s var(--ease-out) both;
  --animate-msg-in: msg-in 0.3s var(--ease-spring) both;
  --animate-pop-in: pop-in 0.25s var(--ease-spring) both;
  --animate-sheet-up: sheet-up 0.35s var(--ease-sheet) both;
  --animate-toast-in: toast-in 0.25s var(--ease-out) both;
  --animate-typing: typing-dot 0.9s var(--ease-standard) infinite;
}

body {
  background: var(--canvas);
  color: var(--ink);
  font-family: var(--font-sans);       /* no Arial override */
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
```

### 2.1 Token usage cheatsheet

| Token | Use for | Forbidden for |
|---|---|---|
| `canvas` | page backgrounds | cards |
| `surface` | cards, lists, popovers, chat background | — |
| `ink` / `ink-2` | all primary/secondary text | — |
| `ink-3` | placeholders, disabled, decorative icons, ≥19px captions only | body-size informative text (fails AA at small sizes) |
| `hairline` | every separator/border | input strokes |
| `line` | input/select/textarea strokes, QR tile border | large-area borders |
| `accent` | primary buttons, links, focus, guest bubbles, active nav | headings, icons, decoration |
| `success/warning/danger` | status meaning only | decoration |

### 2.2 Spacing rhythm (no tokens needed — rules)

4px grid. Landing: section padding `py-24 md:py-36`, container `max-w-[1024px] px-6`.
Dashboard: page `py-8 md:py-12`, content column `max-w-[1024px] mx-auto px-5 md:px-8`,
vertical stack `space-y-8`, cards `p-5 md:p-6`, list rows `px-5 py-4`. Chat: bubbles gap
2px within a group, 16px between groups.

### 2.3 Status color map (replaces `StatusPill` COLORS)

AA-checked text-on-tint pairs; pill = tinted bg + colored text + 6px dot of the same hue.
All pairs ≥4.5:1.

| Status | Pill classes (beyond the base, §4.6) |
|---|---|
| `ready`, `done`, `resolved` | `bg-success-tint text-success` |
| `occupied`, `arrived` | `bg-accent-tint text-[#0a62c0]` |
| `needs_cleaning`, `pending` | `bg-warning-tint text-warning` |
| `cleaning`, `in_progress` | `bg-[#f0ebfd] text-[#5b3fbf]` |
| `blocked`, `open` (escalation) | `bg-danger-tint text-danger` |
| `upcoming` | `bg-surface-2 text-ink` |
| `departed`, `skipped` | `bg-surface-2 text-ink-2` |
| `cancelled` | `bg-danger-tint text-danger` |
| unknown | `bg-surface-2 text-ink-2` |

### 2.4 Iconography

Replace every emoji used as UI chrome (🏠 💬 🤖 ⚠ 📇 🎉 …) with inline SVG line icons:
stroke `currentColor`, stroke-width 1.6, round caps, 24×24 viewBox, rendered at 16–20px
in UI and 24px in the mobile tab bar. One tiny `Icon.tsx` wrapper in `src/components`
with a name→path map is acceptable (no icon library). Emojis may remain *inside chat
message copy* (guest-facing persona) — never in headers, nav, buttons, or empty states.
Suggested set: house, tray (inbox), calendar-day (today), columns (board),
sparkles/broom (tasks), ticket (reservations), gear (settings), chevron-right,
chevron-left, check, x, copy, qr, wifi, clock, alert-triangle, arrow-up (send),
arrow-right, plus, printer, person.

### 2.5 Numbers, dates, code

Monospace (`font-mono`) for URLs, chat tokens, template variables. Dates/times stay in
`text-footnote text-ink-2`. Big metric numbers (Today page): `text-[32px] font-semibold
tracking-[-0.02em] tabular-nums`.

### 2.6 Dark mode — deliberate decision

Ship light-only now. The current `prefers-color-scheme: dark` block in `globals.css`
already half-applies (dark body behind light-styled pages) — **delete it**; it's a bug.
Because every color routes through the semantic tokens above, a later dark pass is one
`:root` override block, not a rewrite. Do not scatter `dark:` utilities now.

---

## 3. Per-screen specification

Every screen below: what stays (logic), what changes (visual), states.

### 3.1 Landing — `src/app/page.tsx`

Container `max-w-[1024px] mx-auto px-6` for every section. Canvas `bg-canvas`.

**Nav** — becomes Apple.com-style frosted sticky bar:
`sticky top-0 z-50 border-b border-hairline bg-[var(--nav-bg)] backdrop-blur-nav`.
Inner `flex h-12 items-center justify-between`. Brand: 20px monogram tile
(`rounded-[6px] bg-ink text-white` "A") + "AUTOMI" `text-[15px] font-semibold tracking-[0.08em]`.
Links (How it works / Features / Pricing): `hidden sm:block text-[12px] text-ink-2
hover:text-ink transition duration-150`; gap-7. "Sign in": same 12px link style (drop the
pill — Apple's nav has no buttons). Add `scroll-mt-16` to `#how/#features/#pricing`.

**Hero** — `pt-20 pb-16 md:pt-28 md:pb-24`, centered.
- Eyebrow: replace the uppercase amber pill with a kicker —
  `text-[17px] font-semibold text-accent` ("Airbnb manages your bookings. AUTOMI manages
  your guests." in sentence case).
- H1 `text-display` — first line ink, second line ("Available 24/7.") `text-ink-3`
  (3.8:1 passes AA-large at display size).
- Sub: `mt-5 max-w-xl text-[19px] leading-relaxed text-ink-2` ("Instant answers for
  guests. Fewer interruptions for you." — keep existing copy otherwise).
- CTAs: `mt-8 flex flex-col sm:flex-row justify-center gap-3` — primary lg pill
  "Start Free Trial", secondary lg pill "See How It Works". Wrap hero in
  `animate-fade-up`.

**Chat demo** — the hero prop. `mx-auto mt-14 max-w-sm rounded-xl bg-surface shadow-float
p-6 text-left`. Header: 32px avatar tile (`rounded-full bg-accent-tint text-accent` with
bot glyph) + "Automi Concierge" `text-callout font-semibold` + caption
`text-caption-1 text-success` with 6px green dot "online 24/7", divider `border-hairline`.
Bubbles use the guest-chat spec (§3.13): guest = accent right, AI = `bg-bubble-in` left,
escalated AI answer = `bg-bubble-in` left followed by centered chip
`text-caption-1 text-ink-2` "⚠ Host notified" (alert-triangle icon, no emoji).

**How it works** (`#how`) — `border-y border-hairline bg-surface py-24 md:py-32`.
H2 `text-headline` centered; sub `max-w-lg text-[17px] text-ink-2` centered.
Grid `mt-14 gap-10 sm:grid-cols-2 lg:grid-cols-4`. Step: number `text-[13px] font-semibold
text-ink-3` ("01"), title `mt-2 text-title-3`, body `mt-1.5 text-callout text-ink-2
leading-relaxed`. Stagger `animate-fade-up` by 60ms per step (inline `style` delay).

**Features** (`#features`) — `py-24 md:py-32` on canvas. H2/sub as above.
Cards: `rounded-lg border border-hairline bg-surface p-7 shadow-card transition
duration-300 ease-out hover:-translate-y-1 hover:shadow-raised`.
Icon tile: `flex h-11 w-11 items-center justify-center rounded-[12px]` with tint/icon
pairs — Concierge `accent-tint/accent`, Knowledge `accent-tint/accent`, Escalation
`danger-tint/danger`, Cleaning `success-tint/success`, Calendar `warning-tint/warning`,
Multi-Property `surface-2/ink-2`. Title `mt-4 text-title-3`; body
`mt-1.5 text-callout text-ink-2`.

**Pricing** (`#pricing`) — `border-t border-hairline bg-surface py-24 md:py-32`.
H2 `text-headline`. Cards `rounded-[24px] p-8 border border-hairline bg-surface` for
Starter/Business; **featured Professional** card: `bg-ink text-white border-transparent
shadow-float` + "Most popular" pill `bg-accent text-white text-caption-1 font-medium
rounded-full px-2.5 py-1`. Plan name `text-callout font-medium` (accent on featured →
use `text-[#6db2ff]` for AA on ink). Price `text-[40px] font-semibold tracking-[-0.02em]`,
`/month` `text-footnote text-ink-2` (`text-white/60` on featured). Checkmarks: 14px
`text-accent` check icon (`text-[#6db2ff]` on featured). CTA: featured = primary pill,
others = secondary pill. Footnote `text-caption-1 text-ink-3` centered.

**Footer** — `border-t border-hairline py-10`, same container; `text-[12px] text-ink-3`,
"Sign in" link `text-ink-2 hover:text-ink`.

**Signed-in state** — keep the single centered CTA, restyled: `bg-canvas`, primary lg
pill "Go to dashboard →".

### 3.2 Login — `src/app/login/page.tsx`

Apple-ID style: no card-in-page. `bg-canvas`, centered column
`w-full max-w-[400px] px-6` with the AUTOMI monogram tile centered at top (32px), then:
title `text-title-1` ("Sign in" / "Create your account"), sub `text-callout text-ink-2`.
Form fields per input spec (§4.2), stacked `space-y-4`, h-48px inputs on mobile
(`h-12 text-[16px]`), labels `text-[13px] font-medium text-ink` above each.
Primary button full-width lg pill; pending state: label "Signing in…" + spinner (CSS
border spinner, 16px, currentColor). Mode toggle: `text-callout text-accent
hover:underline` centered `mt-5` (replace the plain slate button).
Error: inline row `flex items-start gap-1.5 text-footnote text-danger` with 14px
alert-circle icon (replaces the red box).

### 3.3 Dashboard shell — `src/app/(dash)/layout.tsx`

**Recommendation: keep a sidebar — restyle it as the iCloud pattern, and make it an iOS
bottom tab bar on phones.** Rationale: 7 destinations used all day by a desktop operator;
Apple's own web app (iCloud.com) uses a frosted sidebar on regular widths, and iOS uses
a bottom tab bar on compact widths. A single frosted top bar would hide 5 of 7
destinations behind a menu — wrong for this product.

Desktop (`md+`): fixed left sidebar 264px —
`fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-hairline
bg-[var(--sidebar-bg)] backdrop-blur-nav px-3 py-5 md:flex`.
Brand row (`px-3 pb-4`): monogram tile + "AUTOMI" `text-[15px] font-semibold
tracking-[0.08em] text-ink`. Nav `flex-1 space-y-1`: items
`flex h-10 items-center gap-2.5 rounded-sm px-3 text-callout font-medium text-ink-2
transition duration-150 hover:bg-black/[0.04] hover:text-ink` + 18px line icon;
**active** = `bg-surface text-ink shadow-card` (crisp white pill on frosted gray — the
iCloud selection look). Needs a small client `<SideNav>` using `usePathname()`; the
layout itself stays a server component and still calls `requireOrgMember()`.
Sign out stays the same `<form action={signOutAction}>` with a ghost nav-item button
(person icon + existing label text).

Content: `md:pl-[264px]`; inner `mx-auto max-w-[1024px] px-5 py-8 md:px-8 md:py-12`.
Each page's top block gets a consistent header: h1 `text-title-1` + optional
`text-footnote text-ink-2` sub-line.

Mobile (`<md`): `md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-hairline
bg-[var(--nav-bg)] backdrop-blur-nav pb-[env(safe-area-inset-bottom)]`, grid of 5:
Today, Inbox, Board, Tasks, More. Items: 24px icon + `text-[10px] font-medium`, active
`text-accent`, inactive `text-ink-2`. "More" opens the bottom-sheet pattern (§4.8)
listing Reservations, Properties, Settings, and the sign-out form. Client component
`<TabBar>` with `usePathname()`. Add `pb-24 md:pb-0` to the content wrapper so the last
row clears the bar.

### 3.4 Today — `src/app/(dash)/dashboard/page.tsx`

- Header: "Today" → greeting `text-title-1` ("Good morning" logic not available without
  data changes — keep the static "Today" heading, restyled), date `text-footnote
  text-ink-2`.
- Status strip: 5 tiles `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4`; tile
  `rounded-lg border border-hairline bg-surface p-5 shadow-card`, number
  `text-[32px] font-semibold tracking-[-0.02em] tabular-nums`, StatusPill below.
  Tiles stay non-interactive (no logic change).
- AI-handled metric: the hero stat — `rounded-xl bg-accent-tint p-6 flex items-center
  gap-6` (no border): number `text-[44px] font-semibold text-accent tracking-[-0.02em]`,
  caption `text-callout text-ink-2 max-w-xs`. Wrap in `animate-fade-up`.
- Escalations card (when count > 0): `rounded-lg border border-hairline bg-danger-tint
  p-5 transition hover:bg-[#fbdede]`, title row = alert-triangle icon (danger) +
  `text-callout font-semibold text-danger` "Open escalations (n)"; reasons listed as
  `text-callout text-ink`; whole card remains the existing single link to
  `/inbox?tab=escalated` with a trailing chevron.
- Arrivals / Departures / Open cleaning tasks: three list-cards (§4.4). Row anatomy:
  title `text-callout font-medium text-ink` (guest → property link, existing hrefs),
  caption `text-footnote text-ink-2` (email or the ⚠ missing-email note — replace ⚠
  emoji with 12px alert icon inline), trailing action zone: CopyButton becomes ghost
  icon-pill (§4.1), "Conversation"/"Cleaning" become small secondary pills (h-8,
  `text-[13px]`). Empty rows: `EmptyRow` — single centered `text-callout text-ink-2 py-8`
  (keep copy).
- Missing-email hint: `text-footnote text-warning` with alert icon.

### 3.5 Inbox list — `src/app/(dash)/inbox/page.tsx`

- H1 `text-title-1`.
- Tabs → **segmented control** (§4.7): All / Unread / Escalated (drop the ⚠ emoji; the
  Escalated segment shows a 6px danger dot when the tab is active).
- List-card (§4.4), rows are the existing `<Link>`s: leading 40px avatar circle with
  guest initial (`bg-accent-tint text-accent text-callout font-semibold`, or
  `bg-surface-2 text-ink-2` when no name); middle: name `text-callout font-medium` +
  property `text-footnote text-ink-2` inline, preview `text-callout text-ink-2 truncate`;
  trailing: unread badge `rounded-full bg-accent text-white text-[11px] font-medium
  h-5 min-w-5 px-1.5 grid place-items-center` + timestamp `text-caption-1 text-ink-3`.
  Escalated rows: danger dot before the name + "Escalated" mini-pill (`bg-danger-tint
  text-danger text-[11px]`). Hover `hover:bg-black/[0.02]`.
- Empty state (§4.10) per tab: "Nothing needs you" / body copy kept.

### 3.6 Conversation — `src/app/(dash)/inbox/[id]/page.tsx`

- Sticky detail header inside the content column: `sticky top-0 z-20 -mx-5 md:-mx-8
  px-5 md:px-8 py-3 bg-[var(--nav-bg)] backdrop-blur-nav border-b border-hairline` —
  back link "‹ Inbox" (`text-callout text-accent`), guest name `text-title-3`, caption
  `text-footnote text-ink-2` (dates · reservation link · copy-chat-link ghost pill).
- Escalation banners: `rounded-lg border border-hairline bg-danger-tint p-5`: header row
  alert-triangle icon + reason title `text-callout font-semibold text-danger` (+ "
  — URGENT" stays), summary `text-callout text-ink`, then the existing action components
  restyled: Approve = primary pill sm, Decline = ghost-danger pill sm; the resolve/snooze
  controls (EscalationBannerActions) = secondary pill sm.
- Transcript: full Messages-grade treatment, max-w-[720px]:
  - guest → left `bg-bubble-in text-ink` bubble (§4.9);
  - concierge/AI → left `bg-surface shadow-card` bubble with tiny 28px bot avatar and
    `text-caption-1 text-ink-2` "Concierge" label above;
  - host → right `bg-accent text-white`;
  - system_note → centered chip `rounded-full bg-surface-2 px-3 py-1 text-footnote
    text-ink-2`.
  The existing per-role `text-[10px]` uppercase label inside bubbles becomes the caption
  label above (non-uppercase); keep the "escalated" marker as a 12px danger alert icon
  in that label; keep model name in the caption for AI bubbles.
- Composer (HostComposer): chat composer pattern (§4.9 host variant) — rounded-2xl
  surface field, auto-grow textarea, send = primary pill; keep placeholder copy,
  pending state "Sending…".

### 3.7 Status board — `src/app/(dash)/board/page.tsx`

- H1 + sub `text-footnote text-ink-2` ("Live status of every property" — new copy, or
  omit if you prefer none).
- Grid `gap-4 sm:grid-cols-2 lg:grid-cols-3`. Card: `rounded-lg border border-hairline
  bg-surface p-5 shadow-card`: name `text-title-3` + StatusPill (right); caption row
  `text-footnote text-ink-2` with 14px clock/home icons ("check-in 16:00 · checkout
  10:00 · Europe/Paris").
- `StatusChangeMenu` → the popover/menu pattern (§4.8): trigger = secondary pill sm
  "Change status"; menu = `absolute end-0 mt-2 min-w-[220px] rounded-md border
  border-hairline bg-surface shadow-float p-1.5 animate-pop-in` with a check icon on the
  current status; **on <md the same options render as a bottom sheet** (trigger label
  unchanged). Focus-trap not required if the menu keeps native buttons + Escape/blur
  close; keep it simple and accessible (`role="menu"`, arrow-key optional).
- Empty state (§4.10): house icon, "No properties yet", primary pill "Add property"
  → `/properties/new`.

### 3.8 Tasks — `src/app/(dash)/tasks/page.tsx`

- Section titles `text-title-3` + count caption.
- Open list (§4.4): leading = 40px tile with house icon on `bg-surface-2 text-ink-2`;
  title "Property" `text-callout font-medium` + StatusPill; caption row: due chip +
  assignee. Due chips: **Today** `bg-warning-tint text-warning`, **Overdue** — if dueAt
  is past (visual comparison only, no data change) — `bg-danger-tint text-danger`,
  otherwise `bg-surface-2 text-ink-2`; all `rounded-full px-2.5 py-0.5 text-[12px]
  font-medium tabular-nums`. Unassigned shown as `text-ink-3` "unassigned".
  Trailing: CopyButton ghost icon-pill + TaskRowActions as secondary pill sm
  ("Start"/assign menu per existing logic).
- Ad-hoc task form (AdHocTaskForm): inside `rounded-lg border border-hairline bg-surface
  p-5 md:p-6 shadow-card`, two-column input grid on md, inputs per §4.2, submit =
  primary pill.
- Cleaners (CleanerPanel): list-card rows — avatar initial tile, name `text-callout
  font-medium`, email/phone `text-footnote text-ink-2`, trailing copy-link ghost
  icon-pill; InviteForm inputs inline below.
- Recent closed: same rows, opacity-70, no trailing actions.

### 3.9 Reservations list — `src/app/(dash)/reservations/page.tsx`

- H1; filter row becomes a horizontally scrollable chip row: `flex gap-2 overflow-x-auto
  pb-1`. Chip: `h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium inline-flex
  items-center transition duration-150 active:scale-[0.96]`; selected =
  `bg-ink text-white`; unselected = `border border-hairline bg-surface text-ink-2
  hover:text-ink hover:border-line`. Same hrefs.
- **Recommendation on the table:** keep a real table at `lg+` (200 rows of genuinely
  tabular data — Apple's own App Store Connect uses tables), restyled; use stacked
  list-card rows below `lg`. Table: `hidden lg:block overflow-hidden rounded-lg border
  border-hairline bg-surface shadow-card`; `th` = `border-b border-hairline px-5 py-3
  text-left text-[12px] font-medium text-ink-2`; rows `h-14 border-b border-hairline
  last:border-0 hover:bg-black/[0.02] transition duration-150`, cells `px-5 text-callout`,
  guest cell `font-medium text-ink` (existing link), "no email" = 12px warning alert
  icon + text. Mobile list-card rows: two-line (name+property / dates · channel · pill).
- NewReservationForm in a card below (inputs §4.2, submit primary pill).
- Empty state: ticket icon, existing copy, primary pill "Add a reservation".

### 3.10 Reservation detail — `src/app/(dash)/reservations/[id]/page.tsx`

- Back "‹ Reservations" `text-callout text-accent`; H1 `text-title-1`; meta line
  `text-callout text-ink-2` (dates · channel · StatusPill; hold note = warning icon + text).
- Every existing `<section>` becomes `rounded-lg border border-hairline bg-surface p-6
  shadow-card` with `text-title-3` section titles, `space-y-8` between.
- Guest chat link section: left column — URL in `font-mono text-[13px] bg-surface-2
  rounded-sm px-3 py-2 truncate` + ghost copy pill; snippet in the same well with
  `line-clamp-3` + ghost copy pill; helper text `text-footnote text-ink-3`;
  RotateTokenButton = secondary pill sm. Right column — QR in a white tile
  `rounded-md border border-line bg-white p-3` + caption. Keep the existing grid and QR
  generation.
- Guest details (EditReservationForm): iOS grouped-form layout (§4.3).
- Scheduled emails: rows `flex justify-between py-3 border-b border-hairline
  last:border-0` — type `text-callout text-ink`, right side `text-footnote text-ink-2`
  tabular timestamp + StatusPill; errors as warning text.
- Cleaning task: single row card with due chip + StatusPill + ghost copy pill.
- Conversation: `max-h-96 overflow-y-auto` container, bubbles exactly as §3.6.

### 3.11 Properties list + detail

**List** (`properties/page.tsx`): H1 row with primary pill "+ Add property" (right).
List-card rows (existing links): leading 44px house tile `bg-surface-2 text-ink-2`; name
`text-callout font-medium`; meta `text-footnote text-ink-2` (address · check-in/out ·
"iCal connected" · "QR ready" as small neutral chips or caption text); trailing
StatusPill + chevron-right `text-ink-3`. Empty state (§4.10): house icon, existing copy,
primary pill "Set up your first concierge" → `/properties/new`.

**Detail** (`properties/[id]/page.tsx`): back link accent; H1 + right side: StatusPill +
secondary pill sm "Concierge QR card" (qr icon, drop 📇). Tabs → segmented control
(Details / Knowledge base / ICS & sync / History) per §4.7.
- Details/KB forms (PropertyDetailsForm, KnowledgeForm): grouped form (§4.3); Knowledge
  tab groups its many fields under `text-title-3` sub-headings (Access, WiFi & parking,
  Rules & amenities, Guest info, Ops).
- TestQuestionForm: styled as a mini chat: pill input + secondary pill "Ask"; response
  renders in a `bg-bubble-in` bubble — makes the feature self-explanatory.
- IcsPanel: status row (success pill "Synced HH:MM" / warning pill with lastError),
  URL input mono, sync button secondary pill.
- History: list-card rows — action `text-callout font-medium`, actor `text-footnote
  text-ink-2`, timestamp right `text-caption-1 text-ink-3 tabular-nums`, metadata JSON
  as `font-mono text-[12px] bg-surface-2 rounded px-1.5 py-0.5`.

### 3.12 Setup wizard — `src/app/(dash)/properties/new/PropertyWizard.tsx`

The onboarding flagship — make it feel like Apple product setup:
- Centered column `max-w-[640px]`; back link; H1 "Set up your property" `text-title-1`;
  sub `text-callout text-ink-2`.
- Progress: 5 segments `h-[3px] rounded-full bg-black/[0.08]` in a flex row; filled
  portion `bg-accent transition-[width] duration-300 ease-out` (fill = `(step+1)/5`
  width); labels `text-[11px]` — current `font-semibold text-ink`, others
  `text-ink-3`, `hidden sm:block`.
- Step card: `rounded-xl border border-hairline bg-surface p-6 md:p-8 shadow-card`.
  Wrap step body in `<div key={step} className="animate-fade-up">` for the 250ms
  cross-step fade (CSS only; keyed remount triggers it).
- Type selector chips: `h-9 rounded-full px-4 text-callout font-medium border
  transition duration-150 active:scale-[0.96]`; selected `bg-accent border-accent
  text-white`; unselected `border-line bg-surface text-ink hover:border-ink-3`.
- Fields: label `text-[13px] font-medium text-ink`, optional marker
  `font-normal text-ink-3`, example text `text-footnote text-ink-3`, inputs/§4.2 with
  16px text. Textareas `rounded-md min-h-[96px] py-2.5`.
- Footer row: Back = ghost pill (disabled `opacity-40`), Continue/Create = primary pill;
  keep existing disabled logic. Error line: danger text + alert icon.
- Finish screen: replace 🎉 with an 80px circle `bg-success-tint text-success
  grid place-items-center rounded-full animate-pop-in` containing a 36px check icon;
  title `text-title-1` "Your AI concierge is ready"; QR in white tile (border-line,
  rounded-md, p-4); primary pill "Open printable card", secondary pill "Go to property".

### 3.13 Printable QR card — `src/app/(dash)/properties/[id]/card/page.tsx`

This is **physical print design** — the one warm, tactile object in the product.
Rules: no translucency, no backdrop effects, no shadows when printed, high contrast,
cream card stock.

- Screen preview: card centered on `bg-canvas`; the no-print toolbar (back link +
  PrintButton as primary pill sm with printer icon) stays.
- Card (`#card`): fixed `w-[380px] rounded-xl bg-[#faf7f2] p-10 text-center` with a
  `border border-[#e3dccd]` visible on screen only (print keeps the existing
  shadow-strip via `box-shadow:none` print rule — extend that rule to also remove this
  border: add `border-color: transparent` for `#card` under `@media print`).
- Wordmark row: monogram tile `bg-ink text-[#f2cc8f]?` — **no**: high-contrast rule →
  tile `bg-[#1d1d1f] text-white`; "AUTOMI" `text-[13px] font-semibold tracking-[0.22em]
  text-[#1d1d1f]`.
- Eyebrow "Your stay assistant": `text-[11px] font-medium uppercase
  tracking-[0.25em] text-[#6e6e73]` (4.9:1 on cream — AA; the old stone-400 fails).
- H "Need anything?" `text-[28px] font-semibold tracking-[-0.02em] text-[#1d1d1f]`;
  sub `text-[15px] text-[#6e6e73] leading-snug`.
- QR tile: `mx-auto mt-6 w-fit rounded-[16px] bg-white p-4 border border-[#d2d2d7]`;
  keep `width=210` QR and its quiet zone (margin 1 already set server-side).
- Tag row (WiFi · Check-in · …): `text-[11px] uppercase tracking-[0.12em]
  text-[#6e6e73]`.
- Property name footer: `text-[13px] text-[#1d1d1f]` above the hairline
  (`border-[#e3dccd]`).
- Print CSS additions in `globals.css`: under the existing `@media print` block add
  `#card { print-color-adjust: exact; -webkit-print-color-adjust: exact; }` and
  `@page { margin: 12mm; }` so the cream background and wordmark survive printing.
- Helper caption below (no-print): `text-footnote text-ink-3`, existing copy.

### 3.14 Guest chat — `src/app/chat/[token]/ChatWidget.tsx` (flagship mobile screen)

Goal: Messages-grade. Mobile-first at 390px; desktop just widens the column.

**Frame** — `main` becomes `flex h-[100dvh] flex-col bg-surface` (white, not slate-50;
`100dvh` fixes the iOS keyboard/URL-bar jump). No page scroll — only the message list
scrolls.

**Header** — `sticky top-0 z-30 border-b border-hairline
bg-[var(--nav-bg)] backdrop-blur-nav` + `pt-[env(safe-area-inset-top)]`; inner
`mx-auto flex h-14 max-w-[640px] items-center gap-3 px-4`: 36px avatar
(`rounded-full bg-accent-tint text-accent` with bot glyph), name
`text-callout font-semibold text-ink` ("Assistant · Property"), status line
`text-caption-1 text-success flex items-center gap-1.5` + 6px green dot "online 24/7".

**Messages** — `flex-1 overflow-y-auto overscroll-contain px-4 py-4`; inner
`mx-auto max-w-[640px] space-y-2`.
- Welcome card: `mx-auto mb-4 max-w-md rounded-lg bg-surface-2 p-5 text-center
  text-callout text-ink-2` (existing copy).
- Guest bubble (right): `ml-auto max-w-[78%] w-fit rounded-[22px] rounded-br-[6px]
  bg-accent px-4 py-2.5 text-[16px] leading-relaxed text-white shadow-card`.
- Assistant bubble (left): `mr-auto max-w-[78%] w-fit rounded-[22px] rounded-bl-[6px]
  bg-bubble-in px-4 py-2.5 text-[16px] leading-relaxed text-ink`.
- Host bubble (left): same as assistant, with a label above:
  `text-caption-1 font-medium text-ink-2 mb-0.5 ml-1` "Your host".
- System/escalation note: centered chip `mx-auto w-fit rounded-full bg-surface-2 px-3
  py-1 text-footnote text-ink-2`.
- Grouping: consecutive same-sender messages get `mt-0.5` instead of the container gap
  (visual only — compute sender from the previous array item).
- Entrance: `animate-msg-in` on every bubble (CSS runs once per mounted node; polled
  re-renders of existing keyed bubbles do not replay it).
- Streaming: while `streaming && !content`, show a `bg-bubble-in` bubble containing the
  3-dot typing indicator (`animate-typing`, dots staggered 150ms via inline animation-
  delay). Once text arrives, the same bubble streams the text with a trailing caret:
  `.streaming-caret::after { content:""; display:inline-block; width:2px; height:1em;
  background: currentColor; margin-left:2px; vertical-align:-2px; animation:
  caret-blink 1s steps(2, start) infinite; }`.

**Quick replies** — horizontal scroller above composer: `flex gap-2 overflow-x-auto
px-4 pb-2 [scrollbar-width:none]`; chip `h-9 shrink-0 rounded-full border border-line
bg-surface px-4 text-[14px] font-medium text-ink inline-flex items-center transition
duration-150 active:scale-[0.95] hover:border-accent hover:text-accent
disabled:opacity-50`. Behavior unchanged (fills the input).

**Composer** — `sticky bottom-0 z-30 border-t border-hairline bg-[var(--nav-bg)]
backdrop-blur-nav pb-[max(env(safe-area-inset-bottom),12px)] pt-3`; inner
`mx-auto max-w-[640px] px-4`:
`flex items-end gap-2 rounded-[20px] border border-line bg-surface px-3 py-1.5
transition duration-150 focus-within:border-accent focus-within:ring-[3px]
focus-within:ring-focus/20` containing the auto-growing textarea (`min-h-10 max-h-32
flex-1 resize-none bg-transparent text-[16px] leading-6 outline-none
placeholder:text-ink-3`) and a 32px circular send button
(`h-8 w-8 shrink-0 rounded-full bg-accent text-white grid place-items-center transition
duration-150 active:scale-[0.9] disabled:bg-black/[0.08] disabled:text-ink-3`) with an
↑ arrow icon — the iOS Messages send button. Keep Enter-to-send, maxLength, disabled
logic, and the centered `text-footnote text-danger` error line.
- **Performance rules:** the only blurred elements are header + composer (2 total); all
  animations are opacity/transform only; no new images; poll stays 15s.

**States** — initial load: 3 shimmer bubbles (§4.11); expired link → existing
`not-found` (§3.16); 429/network errors: existing inline line, restyled.

### 3.15 Cleaner page — `src/app/c/[token]/page.tsx`

Phone-first, glove-friendly: `bg-canvas` → keep white `bg-surface` with cards, or canvas
+ white cards — use `bg-canvas` + cards for depth. Container
`mx-auto max-w-[480px] px-4 py-8 pb-[max(env(safe-area-inset-bottom),24px)]`.
- Header: "Cleaning" kicker `text-[13px] font-medium text-accent uppercase
  tracking-[0.08em]`? No — sentence case kicker `text-footnote text-ink-2` ("Cleaning"),
  then property name `text-title-1`; address + due `text-callout text-ink-2` with
  clock/pin icons; StatusPill below (render at 14px text for this page).
- Access notes card: `rounded-lg border border-hairline bg-surface p-5 shadow-card`,
  title `text-callout font-semibold`, body `text-body text-ink-2 whitespace-pre-wrap`.
- CleanerActions: full-width buttons `h-[52px] w-full rounded-md text-[17px]
  font-semibold active:scale-[0.98] transition duration-150` — "Start cleaning" =
  primary; "Mark cleaned" = `bg-success text-white hover:bg-[#136c34]`; "Can't clean" /
  skip = `border border-line bg-surface text-danger`. Pending: label + 16px spinner.
  Closed: success banner `rounded-lg bg-success-tint p-5 text-center` with 24px check
  icon `text-success`, "This task is done" `text-callout font-semibold text-ink`.
- Footer caption `text-caption-1 text-ink-3 text-center` (existing copy).

### 3.16 Empty, error, and utility screens

- **not-found / expired link** (`src/app/not-found.tsx`): `bg-canvas` centered;
  56px tile `bg-surface-2 text-ink-2 rounded-[16px]` with lock icon; title
  `text-title-2`; body `text-callout text-ink-2 max-w-sm`; "bnb-ops" link →
  `text-callout text-accent`.
- **Empty states** — see pattern §4.10; applied at: board (no properties), tasks (none
  open / none closed), inbox (per tab), reservations, properties, scheduled emails
  (inline `text-footnote text-ink-2 py-3`), conversation transcript ("No messages yet").
- **Loading** — add `loading.tsx` (server components stay server) for `(dash)` routes:
  persistent chrome + content skeleton (§4.11): page title bar (rounded block 180×24),
  2–3 card blocks with 3 shimmer lines each, staggered `animate-fade-up`. Guest chat:
  3 bubble skeletons + disabled composer.
- **Settings** (`settings/*`, team, templates): grouped forms (§4.3) in cards; team rows
  = list-card with person tile, role caption, RemoveStaffButton = ghost-danger icon
  button with the iOS alert confirm (§4.8); TemplateEditor = inputs + textarea, template
  variables rendered as `font-mono text-[13px] bg-surface-2 rounded px-1.5` chips in the
  helper text.

---

## 4. Component patterns

Exact class strings (compose from §2 tokens). For anything used 3+ times, add a plain
CSS class in `globals.css` via `@apply` (e.g. `.btn-primary`) — no component library, no
CSS-in-JS; plain `.tsx` wrappers in `src/components` are fine.

### 4.1 Buttons

Base for all: `inline-flex items-center justify-center gap-1.5 rounded-full font-medium
transition duration-200 ease-out focus-visible:outline-2
focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-40
disabled:pointer-events-none`.

| Variant | Classes (added to base) |
|---|---|
| Primary | `bg-accent text-white hover:bg-accent-hover hover:scale-[1.02] active:scale-[0.97]` |
| Secondary | `border border-line bg-surface text-ink hover:border-ink-3 hover:bg-surface active:scale-[0.97]` |
| Ghost | `text-accent hover:bg-accent-tint active:scale-[0.97]` |
| Ghost-danger | `text-danger hover:bg-danger-tint active:scale-[0.97]` |
| Destructive | `bg-danger text-white hover:bg-danger-hover active:scale-[0.97]` |

Sizes: `h-9 px-4 text-[14px]` (sm) · `h-11 px-5 text-[15px]` (md) · `h-[52px] px-7
text-[17px]` (lg, landing). Icon-only (copy, close): `h-9 w-9 rounded-full` with an
18px icon, Ghost variant + `aria-label`. Pending: swap label to "…" + a 16px CSS spinner
(`animate-spin rounded-full border-2 border-current border-t-transparent`).

### 4.2 Inputs

`h-11 w-full rounded-md border border-line bg-surface px-3.5 text-[16px] text-ink
placeholder:text-ink-3 shadow-card transition duration-150 ease-out hover:border-ink-3
focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-focus/20
disabled:bg-surface-2 disabled:text-ink-3` — textareas add `py-2.5 min-h-11` (and
`min-h-24` where multi-line). Labels: `mb-1.5 block text-[13px] font-medium text-ink`;
helper/error text `mt-1.5 text-footnote text-ink-3` / `text-danger`. `select`:
`appearance-none pr-10` + a 12px chevron via CSS `background-image` (data-URI stroke
chevron, `background-position: right 12px center; background-repeat: no-repeat`).
Checkbox/radio: `h-[18px] w-[18px] rounded-[5px] border border-line accent-[#0071e3]`.
**Never render inputs below 16px font** (iOS zoom + Apple spec).

### 4.3 Grouped form (iOS Settings style) — for Details/KB/Settings/Org forms

`overflow-hidden rounded-lg border border-hairline bg-surface shadow-card`; rows
`border-b border-hairline last:border-0 px-5 py-4 grid gap-1.5 md:grid-cols-[200px_1fr]
md:items-center md:gap-4` — label `text-callout text-ink` left (stacked above on
mobile), control right. Submit row below the card: primary pill, right-aligned.

### 4.4 Card + list-card (the workhorse)

Card: `rounded-lg border border-hairline bg-surface shadow-card`.
List container: `overflow-hidden rounded-lg border border-hairline bg-surface
shadow-card divide-y divide-hairline` with rows as `<Link>`/`<button>`:
`flex w-full items-center gap-3 px-5 py-4 text-left transition duration-150
hover:bg-black/[0.02] active:bg-black/[0.04]`. Row anatomy: leading (40px avatar/tile) →
middle (title `text-callout font-medium text-ink`; caption `text-footnote text-ink-2`) →
trailing (meta `text-caption-1 text-ink-3 tabular-nums`, pills/buttons, 16px
chevron-right `text-ink-3`). This replaces dense tables everywhere except §3.9's `lg`
table. **No zebra stripes, no inner box shadows.**

### 4.5 Tables (only where kept — reservations `lg+`)

See §3.9. Rules: hairline row separators only, `text-callout`, header `text-[12px]
text-ink-2 font-medium`, row hover `bg-black/[0.02]`, generous 56px row height, right-
align numeric columns with `tabular-nums`.

### 4.6 Badges / status pills (StatusPill v2)

Base: `inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px]
font-medium` + dot `h-1.5 w-1.5 rounded-full bg-current` + per-status classes from the
§2.3 table. Keep the same component API (`<StatusPill status>`), same file, same
callers. Unread count badge: `h-5 min-w-5 rounded-full bg-accent px-1.5 text-[11px]
font-medium text-white grid place-items-center`. "Most popular", counts, etc.: neutral
pill `bg-surface-2 text-ink-2`.

### 4.7 Segmented control (tabs: inbox, property detail)

`inline-flex rounded-full bg-black/[0.05] p-1` (wrap in `overflow-x-auto` on mobile);
segment (existing `<Link>`s): `h-8 shrink-0 rounded-full px-4 text-[14px] font-medium
text-ink-2 transition duration-200 ease-out hover:text-ink` + active
`bg-surface text-ink shadow-card`.

### 4.8 Overlays — menu popover, bottom sheet, alert, toast

- **Popover menu** (desktop): `absolute z-40 min-w-[220px] rounded-md border
  border-hairline bg-surface p-1.5 shadow-float animate-pop-in origin-top`; item =
  `flex h-9 items-center gap-2 rounded-[10px] px-3 text-callout text-ink transition
  duration-100 hover:bg-black/[0.04]`; current item gets a 14px accent check icon;
  destructive items `text-danger hover:bg-danger-tint`. Close on outside click / Escape.
- **Bottom sheet** (<md and confirm flows): overlay `fixed inset-0 z-50
  bg-[var(--overlay)]` (fade-in 200ms); sheet `fixed inset-x-3 bottom-3 z-50
  rounded-xl bg-surface p-2 pb-[max(env(safe-area-inset-bottom),8px)] shadow-float
  animate-sheet-up`; grabber `mx-auto mb-2 h-1 w-9 rounded-full bg-black/15`; items as
  popover items at h-12; a "Cancel" row `text-accent font-semibold`.
- **Alert (confirm dialogs)**: centered `w-[280px] md:w-[320px] overflow-hidden
  rounded-xl bg-surface shadow-float text-center animate-pop-in`; icon/title
  `p-6 pb-4` (`text-title-3`; optional 28px icon in tinted circle); message
  `text-footnote text-ink-2`; buttons `grid grid-cols-2 divide-x divide-hairline
  border-t border-hairline` — each `h-12 text-[17px]` (cancel `text-ink-2`, confirm
  `text-accent`, destructive confirm `text-danger`).
- **Toast** (for Copy feedback if desired; CopyButton may keep inline label swap):
  `fixed bottom-24 md:bottom-8 left-1/2 z-[60] -translate-x-1/2 h-11 rounded-full
  bg-ink px-5 text-callout text-white shadow-float animate-toast-in` — auto-dismiss 2.5s.

### 4.9 Chat bubbles + composer

Guest-facing page: see §3.14. Host inbox (§3.6) mirrors it with host = sender-right.
Canonical class strings:

```css
.bubble-out { /* sender: guest on guest page, host in inbox */
  margin-inline-start: auto; max-width: 78%; width: fit-content;
  border-radius: 22px 22px 6px 22px;
  background: var(--accent); color: #fff;
  padding: 10px 16px; font-size: 16px; line-height: 1.45;
  box-shadow: var(--shadow-card);
}
.bubble-in { /* recipient */
  margin-inline-end: auto; max-width: 78%; width: fit-content;
  border-radius: 22px 22px 22px 6px;
  background: var(--bubble-in); color: var(--ink);
  padding: 10px 16px; font-size: 16px; line-height: 1.45;
}
.bubble-note { /* system */
  margin-inline: auto; width: fit-content;
  border-radius: 999px; background: var(--surface-2); color: var(--ink-2);
  padding: 4px 12px; font-size: 13px;
}
```

### 4.10 Empty state

`flex flex-col items-center py-16 px-6 text-center`: 56px tile
(`rounded-[16px] bg-accent-tint text-accent grid place-items-center` with a 24px line
icon — tint per context), title `mt-4 text-title-3 text-ink`, body
`mt-1.5 max-w-xs text-callout text-ink-2`, optional action pill `mt-6`.

### 4.11 Skeletons

```css
.skeleton { position: relative; overflow: hidden;
  background: var(--surface-2); border-radius: 10px; }
.skeleton::after { content: ""; position: absolute; inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent,
    rgb(255 255 255 / 0.6), transparent);
  animation: shimmer 1.4s infinite; }
@keyframes shimmer { 100% { transform: translateX(100%); } }
```

Usage: `.skeleton h-4 w-2/3`, `.skeleton h-11 w-full`, bubble skeletons
`.skeleton h-10 w-2/3 rounded-[22px]`.

---

## 5. Motion & smoothness spec

CSS-only. No JS animation library — nothing here needs one; keyed remounts +
`animation … both` cover enter effects, and everything else is `transition`.

| Interaction | Spec |
|---|---|
| Button/link hover | color+background `duration-200 ease-out`; primary CTAs also `scale-[1.02]` |
| Press (all buttons/chips/rows) | `active:scale-[0.97]` (compact: `[0.95]`), 100–150ms |
| Card hover (landing features, board) | `hover:-translate-y-1 hover:shadow-raised`, `duration-300 ease-out` |
| Page content on load | `animate-fade-up`: opacity 0→1 + `translateY(12px)`→0, 400ms `ease-out`, once; stagger sections +60ms |
| Step change (wizard) | keyed `animate-fade-up` at 250ms |
| New chat bubble | `animate-msg-in`: opacity + `translateY(8px) scale(0.97)`→1, 300ms `ease-spring` |
| Popover/menu | `animate-pop-in`: opacity + `scale(0.96)`→1, 250ms `ease-spring`, `origin-top` |
| Bottom sheet | `animate-sheet-up`: `translateY(100%)`→0, 350ms `ease-sheet`; overlay fade 200ms |
| Toast | `animate-toast-in`: `translateY(12px)`+fade, 250ms `ease-out` |
| Typing dots | `animate-typing`: dot `translateY(-3px)` pulse, 900ms infinite, 150ms stagger |
| Streaming caret | 1s `steps(2)` blink |
| Skeleton | shimmer 1.4s linear infinite (§4.11) |
| Segmented control | color change 200ms; no sliding thumb (keeps it CSS-only) |
| Anchor nav (landing) | native `scroll-behavior: smooth` + `scroll-mt-16` on sections |

Keyframes to define in `globals.css` (plain CSS, top level):

```css
@keyframes fade-up { from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; } }
@keyframes msg-in { from { opacity: 0; transform: translateY(8px) scale(0.97); }
  to { opacity: 1; transform: none; } }
@keyframes pop-in { from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); } }
@keyframes sheet-up { from { transform: translateY(100%); } to { transform: none; } }
@keyframes toast-in { from { opacity: 0; transform: translate(-50%, 12px); }
  to { opacity: 1; transform: translate(-50%, 0); } }
@keyframes typing-dot { 0%, 60%, 100% { transform: none; opacity: 0.4; }
  30% { transform: translateY(-3px); opacity: 1; } }
@keyframes caret-blink { 50% { opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Banned: parallax, scroll-jacking/hijacking, bounce/elastic anywhere except the
intentional 1.3 overshoot in `ease-spring`, autoplaying media, spinners on skeleton
screens (shimmer only), blur on scroll-driven elements. Guest chat keeps exactly two
`backdrop-blur` surfaces; all animations are compositor-friendly (transform/opacity).

---

## 6. Implementation order

Each step is independently verifiable. Do not interleave steps.

1. **Tokens + base** — replace the token section of `globals.css` with §2 (delete the
   Arial `font-family`, the dark-scheme block; keep the print block). No markup changes.
   *Done when:* app renders unchanged in structure but with new canvas/ink/font; `npm
   run build` passes; `prefers-reduced-motion` media block present; no console warnings
   about unknown utilities.
2. **Shared primitives** — `StatusPill` v2 (§4.6/§2.3), `Icon` set (§2.4), button/input/
   list-card/segmented/empty-state/skeleton classes or wrappers (§4), keyframes (§5),
   `.bubble-*` classes. *Done when:* existing pages that use StatusPill/CopyButton look
   right with zero page-level edits; every §4 snippet has a home in `globals.css` or
   `src/components`.
3. **Dashboard shell** — `(dash)/layout.tsx` per §3.3 (frosted sidebar, `<SideNav>`,
   `<TabBar>` + More sheet, content column). *Done when:* at ≥768px the frosted sidebar
   shows all 7 destinations with white active pill; at 390px the bottom tab bar works,
   More sheet opens/closes, sign-out works in both; nothing under the sidebar is
   clipped.
4. **Guest chat** — ChatWidget per §3.14. *Done when:* on a phone (or 390px devtools,
   throttled CPU): header/composer frosted, bubbles per spec with grouping + msg-in,
   quick-reply chips scroll horizontally, send button enables/disables, streaming shows
   typing dots then streamed text with caret, keyboard doesn't cover the composer
   (`100dvh`), scroll stays pinned to bottom on new messages.
5. **Cleaner page + not-found** — §3.15/§3.16. *Done when:* 52px buttons, success
   banner, closed state, safe-area padding; expired-token page styled.
6. **Landing** — §3.1. *Done when:* frosted sticky nav; display-size hero with kicker;
   pill CTAs; chat-demo card uses bubble classes; features/pricing/footer per spec;
   smooth anchor scroll; hero/features stagger fades respect reduced-motion.
7. **Login + wizard** — §3.2/§3.12. *Done when:* 16px inputs, full-width pill submit,
   inline error; wizard progress animates between steps, finish screen shows check +
   QR + two pills.
8. **Today + Inbox + Board + Tasks** — §3.4–§3.8. *Done when:* stat tiles, AI metric
   card, escalation card, list-cards everywhere, segmented inbox tabs, Messages-grade
   conversation + host composer, board cards + menu/sheet status change (logic
   untouched), task due chips.
9. **Reservations + Properties (+detail) + Settings** — §3.9–§3.11, §3.16 settings.
   *Done when:* chip filters, lg table + mobile list-cards, detail sections, grouped
   forms, segmented tabs, test-question mini-chat, history rows.
10. **Print card + polish pass** — §3.13 print CSS; then the QA checklist below.
    *Done when:* printed PDF (or print preview) shows the cream card, crisp QR, no
    shadows/borders/screen furniture; checklist passes.

**QA checklist (final, all screens):** keyboard-tab through every page — visible
`outline-2` ring on every interactive element, logical order; contrast spot-checks:
`text-ink-3` never carries essential info <19px; reduced-motion: no movement anywhere;
mobile pass at 390px for every route incl. guest chat + cleaner; hover states on
desktop; `npm run build` clean; zero emojis in UI chrome.

---

## 7. What must NOT change

- Routes, links, form actions, server actions, polling intervals, stream/SSE logic,
  `requireOrgMember` guards, the print `#card` DOM id and `@media print` isolation.
- Any data fetch or query; the redesign consumes exactly what pages already render.
- Component APIs used across pages (`StatusPill status`, `CopyButton text/label`) —
  restyle internals only.
- No new npm packages. No `dark:` utilities. No CSS-in-JS. No self-hosted SF fonts.

