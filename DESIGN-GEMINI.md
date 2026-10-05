# AUTOMI — Gemini Design Direction

# Lead Product Designer Directive: AUTOMI

---

### 1. Honest Direction Score: 6.5 / 10

#### What’s Working
* **Information Architecture & Spatial Rhythm:** The iOS-inspired baseline (frosted bars, 20–28px card radii, hairline borders, clean mobile spacing) prevents clutter. Host mobile ergonomics are solid.
* **Familiar Mental Models:** The iOS Messages chat paradigm drastically lowers cognitive load for vacationing guests. They already know how to use it without instructions.
* **Speed-Oriented Flows:** Progressive onboarding (one question at a time) and single-tap OTP authentication respect both host and guest attention limits.

#### What’s Broken / Generic
* **The "iCloud Support" Trap:** Palette `#0071e3` on `#f5f5f7` looks like Apple Health or an IT ticket portal. It communicates *technical support*, not *warm hospitality*.
* **Zero Tactile Luxury:** Clinical grays (`#e9e9eb`) make properties feel like sterile glass cubes. Vacation rentals sell comfort, texture, and local character; the UI currently strips that emotion away.
* **Mechanical Chatbot Aesthetic:** The chat interface exposes its LLM nature immediately. Long text blocks and generic blue bubbles make guests feel like they are filing a Zendesk ticket rather than messaging an attentive boutique concierge.

---

### 2. The Gap: Boutique-Hotel Warmth × Apple Simplicity

To bridge the gap, we retain Apple’s mathematical grid and layout discipline while replacing its clinical tech palette with a bespoke hospitality system inspired by Aman and high-end print editorial.

```
┌────────────────────────────────────────────────────────┐
│ UI DIVISION OF WARMTH                                  │
├────────────────────────────┬───────────────────────────┤
│ NEUTRAL & RIGID (Apple)    │ WARM & TACTILE (Hotel)    │
├────────────────────────────┼───────────────────────────┤
│ • 8pt Layout Grid          │ • Linen & Limestone Tint  │
│ • Component Radii & Spacing│ • Deep Cypress/Slate Ink  │
│ • Tab Bars / Navigation    │ • Editorial Serif Accents │
│ • System Inputs & Toggles  │ • WiFi / Action Microcards│
│ • Chart & Metric Glyphs    │ • Welcome & Handoff Copy  │
└────────────────────────────┴───────────────────────────┘
```

#### The Adjusted Palette

```css
:root {
  /* Canvas & Surfaces */
  --canvas:           #F8F6F1; /* Warm French Linen (never clinical gray) */
  --surface-raised:   #FFFFFF; /* Pure White Card Elevation */
  --surface-recessed: #EFECE4; /* Limestone Tint for Inputs / Sub-containers */
  --surface-overlay:  rgba(248, 246, 241, 0.85); /* Frosted Header/Footer */

  /* Inks */
  --ink-primary:      #191816; /* Smoked Obsidian (softer than #000) */
  --ink-secondary:    #66625D; /* Warm Clay Gray */
  --ink-tertiary:     #9E9A93; /* Muted Sandstone */
  --border-subtle:    rgba(25, 24, 22, 0.08); /* 1px hairline tint */

  /* Accents */
  --accent-primary:   #1E2B24; /* Deep English Cypress (Action CTA & Guest Bubble) */
  --accent-hover:     #2D3E35;
  --accent-warmth:    #C27E4B; /* Terracotta Leather (Status dots, badges, highlights) */
  --accent-cream:     #F3EEE6; /* Host/Concierge Chat Bubble */

  /* Semantic */
  --semantic-success: #2A5A3B; /* Forest Sage */
  --semantic-warning: #945B1E; /* Burnished Amber */
  --semantic-danger:  #A8282B; /* Dried Crimson */
}
```

#### Typography Personality
* **UI/Data/Inputs:** System SF Pro / `-apple-system`. Tight tracking (`-0.015em`), legible, utility-focused.
* **Display/Editorial Headers:** `New York` (Apple's serif system font) or `Instrument Serif` (fallbacks: `Playfair Display`, `Georgia`).
* **Usage Rule:** Use the Serif **strictly** for: (1) Property titles, (2) Screen greeting headers ("Good evening, Guest"), and (3) Physical QR print cards. Never use Serifs for buttons, tabs, inputs, or chat body text.

---

### 3. Five Highest-Impact Visual Changes

```
1. COLOR PROFILE:      [ #0071e3 / #f5f5f7 ]  ──▶  [ #1E2B24 / #F8F6F1 ]
2. CHAT ELEVATION:     [ Flat Gray / Blue  ]  ──▶  [ Sandstone / Cypress Micro-Cards ]
3. TYPOGRAPHIC ANCHOR: [ Pure Sans Everything ]──▶  [ Serif Headers + SF Pro Engine ]
4. ACTION SURFACES:    [ 1px Border Only   ]  ──▶  [ Multi-stop Warm Ambient Shadows ]
5. QR DIGITAL TWIN:    [ Generic QR PNG    ]  ──▶  [ Acrylic/Wood Standee Mockup Preview ]
```

#### 1. Replace iOS Blue (`#0071e3`) with Deep Cypress (`#1E2B24`) & Terracotta
* **Element:** All Primary Buttons, Guest Chat Bubbles, Active Segmented Tabs, Links.
* **Current:** Background `#0071e3`, Text `#FFFFFF`.
* **Proposed:** 
  * Primary Button: `background: #1E2B24; color: #FFFFFF; border-radius: 9999px; height: 50px; font-weight: 590;`
  * Active Tab / Badge: `background: #EFECE4; color: #1E2B24; font-weight: 500;`
  * Interactive Accent: `color: #C27E4B;`

#### 2. Chat Stream Architecture: From "Wall of Text" to Structured Cards
* **Element:** Chat Bubbles & Content Payloads (Guest & Host Concierge).
* **Current:** Concierge Bubble `#e9e9eb`, Guest Bubble `#0071e3`. Standard raw markdown text.
* **Proposed:**
  * **Concierge Bubble:** `background: #FFFFFF; color: #191816; border: 1px solid rgba(25,24,22,0.06); box-shadow: 0 2px 8px rgba(0,0,0,0.03); border-radius: 18px 18px 18px 4px; padding: 14px 16px; font-size: 16px; line-height: 1.45;`
  * **Guest Bubble:** `background: #1E2B24; color: #F8F6F1; border-radius: 18px 18px 4px 18px; padding: 12px 16px;`
  * **Interactive Microcards (WiFi, Door Codes, Rules):** Inject styled cards inside concierge bubbles rather than raw strings:
    * `background: #F8F6F1; border-radius: 12px; padding: 12px; border: 1px solid rgba(25,24,22,0.08);` with a 1-tap Copy action.

#### 3. Split Typography: Dual Font Engine (System SF + Editorial Serif)
* **Element:** Main screen page titles, Property Detail titles, and Landing Page Hero.
* **Current:** SF Pro Display Bold, tight tracking, 80px / 34px.
* **Proposed:**
  * Page / Section H1: `font-family: "New York", "Instrument Serif", Georgia, serif; font-weight: 400; font-size: 32px; line-height: 1.15; letter-spacing: -0.02em; color: #191816;`
  * Eyebrows / Context tags: `font-family: -apple-system, sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #C27E4B;`

#### 4. Card Shadows & Elevation: Remove Cold Hairlines
* **Element:** Cards on Today, Properties, and Guest Screens.
* **Current:** `border: 0.5px solid #d1d1d6; background: #ffffff;`
* **Proposed:**
  * `background: #FFFFFF;`
  * `border: 1px solid rgba(25, 24, 22, 0.06);`
  * `box-shadow: 0 1px 2px rgba(25, 24, 22, 0.03), 0 8px 24px rgba(25, 24, 22, 0.04);`
  * `border-radius: 20px;`

#### 5. Interactive Standee Preview for Host QR Card Screen
* **Element:** QR Print Card generator screen (`/properties/[id]/qr`).
* **Current:** Flat white vector card on gray background.
* **Proposed:**
  * Display a 3D-angled, photorealistic mock of the QR card seated in a matte black metal or light-oak base on a linen textured canvas (`#ECE8E1`).
  * Live-toggle materials: **Matte Paper / Brass Standee / Acrylic Base**.
  * Download button: Floating pill CTA with instant PDF print specs (300 DPI crop marks included).

---

### 4. Guest Chat: 3 Hospitality-Grade Improvements

```
┌────────────────────────────────────────────────────────────┐
│ GUEST CHAT HEADER                                          │
│ [ < Back ]   ( Avatar )  The Carriage House Concierge   [●]│
│                          Managed by Sarah · Replies 24/7   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  [Guest]                                                   │
│  ┌───────────────────────────────┐                         │
│  │ What is the WiFi password?    │                         │
│  └───────────────────────────────┘                         │
│                                                            │
│  [Concierge]                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Here are the high-speed network details:             │  │
│  │ ┌──────────────────────────────────────────────────┐ │  │
│  │ │ Network:  Highland_Guest_5G                      │ │  │
│  │ │ Password: mountainliving                         │ │  │
│  │ │ [ TAP TO COPY PASSWORD ]                         │ │  │
│  │ └──────────────────────────────────────────────────┘ │  │
│  │ Sourced from Sarah’s House Manual                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Need Sarah directly? [ Tap to notify host ]          │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

#### 1. Concierge Presence Header with Host Co-Branding
* **Design:** Header does not say "AUTOMI AI Bot". It shows the host's actual profile photo overlapping a small property emblem badge, with 2-line metadata:
  * Line 1 (15px, font-weight: 600): `The Carriage House Concierge`
  * Line 2 (12px, font-weight: 400, color: `#66625D`): `Verified property data · Sarah on standby`
* **Impact:** Grounds the AI as an extension of the host's personal hospitality, not an offshore automation layer.

#### 2. Native Micro-Cards with Instant Action Targets
* When the guest asks for amenities, never send a wall of text:
  * **WiFi:** Renders a dedicated card with network name, bold password, and a full-width `[ Copy Password ]` button that gives haptic feedback and changes to `[ Copied! ✓ ]`.
  * **Parking / Entry:** Displays a thumbnail photo of the keypad/lockbox with an overlay tag `Code: 4812#` and a `[ Open in Apple Maps ]` deep link.
  * **Checkout:** Renders an interactive checklist where items can be ticked off before leaving.

#### 3. Human Pacing & Subtle Assurance Watermark
* **Pacing Engine:** Stop streaming text token-by-token at 100 words/second (which screams "AI Bot"). Instead, use a smooth 1.2-second three-dot ambient typing wave (`#9E9A93`), then reveal complete, formatted message blocks.
* **Host Fallback Capsule:** Beneath every concierge answer, show a whisper-quiet link:
  * `Answered from Sarah’s guide · Need host? Tap to notify`
  * Tapping sends a push notification directly to the host's phone and marks the chat as *Urgent Host Review*.

---

### 5. Landing Page: 3 Instant-Trust Additions for Hosts

```
┌──────────────────────────────────────────────────────────────────────┐
│ HERO CONVERSION FLOW                                                 │
│                                                                      │
│  "Never answer 'What’s the WiFi password?' at 3:00 AM again."        │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ [ Paste your Airbnb listing URL...                ] [ Test ] │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                 ▼                                    │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ ⚡ Instant Concierge Preview Generated in 4 seconds          │    │
│  │ Q: "Can we check out at 1 PM?"                               │    │
│  │ A: "Check-out is strictly 11 AM to prepare for the next     │    │
│  │     guest, but I can check bag drop availability for you."   │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

#### 1. The "Paste Your Airbnb Link" Instant Simulator (Hero Section)
* **What it is:** A single input field directly beneath the hero copy: `[ airbnb.com/rooms/12345... ] [ Generate My Concierge → ]`.
* **The Experience:** The host pastes their link. The engine scrapes publicly visible details (title, house rules, check-in time, general amenities) in 4 seconds and displays an interactive, branded mobile preview of their property's concierge right on the screen.
* **Why it converts:** Eliminates onboarding friction and immediately proves value before signup.

#### 2. The "Deterministic House Rules" Guarantee Card
* **What it is:** A split visual feature card showcasing AUTOMI's safety bounds.
* **Left:** The prompt: *"Can we throw a small birthday party on the deck?"*
* **Right:** The AUTOMI engine response with a highlighted guarantee tag:
  * `Strict Rule Enforcement: No Hallucinations`
  * *"AUTOMI strictly adheres to your house manual. If a rule is unlisted or ambigious, it automatically defers to you without making promises."*
* **Why it converts:** Airbnb hosts are terrified of AI inventing early check-in permissions, allowing parties, or giving away wrong lockbox codes.

#### 3. Real ROI Metric: "The 3:00 AM Incident Log"
* **What it is:** A dynamic calculation widget showing time saved on routine messages.
* **Visual:** An interactive slider for number of listings (e.g., 1 to 15 properties).
* **Output Card:**
  * Displays: `8.5 hours saved / property / month`
  * Sub-stat: `100% 5-Star Communication sub-rating average across 4,200 guest stays`
  * Includes a visual snippet of a real host notification: *"AUTOMI handled: Late night AC temperature settings (11:42 PM) — Host slept uninterrupted."*

---

### 6. Microcopy: 5 Key System Strings

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ VOICE SPECIFICATION: DISCREET • PRECISE • GRACIOUS • CALM                         │
└────────────────────────────────────────────────────────────────────────────────────┘
```

#### 1. Guest First Touch (On QR Code Scan)
* **Old / Generic:** "Welcome to our AI concierge! Ask me anything about your stay."
* **AUTOMI Voice:** 
  > **"Welcome to The Highland Villa. Your stay details, house manual, and recommendations are right here. How can we make your evening comfortable?"**

#### 2. Human Escalation Trigger (When AI is unsure or guest requests host)
* **Old / Generic:** "I don't know that. Transferring to human agent..."
* **AUTOMI Voice:** 
  > **"I’ve flagged this directly for Sarah. She’s been notified and will message you shortly."**

#### 3. Host Dashboard Empty State (Today Tab - Zero pending issues)
* **Old / Generic:** "No new notifications. You're all caught up!"
* **AUTOMI Voice:** 
  > **"All 4 properties are quiet. Guests are checked in and settled; no action needed."**

#### 4. Host Onboarding Primary CTA (Final Step)
* **Old / Generic:** "Submit & Create Account"
* **AUTOMI Voice:** 
  > **"Publish Concierge & Get QR Card"**

#### 5. Physical QR Card Countertop Copy (Print Material placed in the kitchen)
* **Old / Generic:** "Scan for AI Chatbot Assistance."
* **AUTOMI Voice:** 
  > **"Everything you need for your stay.**
  > *Scan to connect with your private 24/7 digital concierge for instant WiFi access, house controls, and local dining favorites."*

---

### Implementation Token Reference Checklist

```css
/* Typography Scale */
--font-serif:   "New York", "Instrument Serif", Georgia, serif;
--font-sans:    -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;

--text-hero:    44px / 1.10 var(--font-serif);
--text-title:   24px / 1.20 var(--font-serif);
--text-body:    16px / 1.45 var(--font-sans);
--text-meta:    13px / 1.30 var(--font-sans);

/* Radius & Elevation */
--radius-card:  20px;
--radius-pill:  9999px;
--radius-bubble: 18px;

--shadow-card:  0 1px 2px rgba(25, 24, 22, 0.03), 0 8px 24px rgba(25, 24, 22, 0.04);
--shadow-hover: 0 4px 12px rgba(25, 24, 22, 0.06), 0 16px 32px rgba(25, 24, 22, 0.06);
```