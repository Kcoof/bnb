# AUTOMI — Complete Page Specs (Gemini)

# AUTOMI — Product & Design Specification System

### Brand Metadata & Global Design Tokens
* **Product Tagline:** The quiet art of hosting, round the clock.
* **SEO Meta Description (3 Words):** AI Guest Concierge
* **Canvas Background:** `#F8F6F1` (French Linen)
* **Surface White:** `#FFFFFF` (Pure Chalk)
* **Surface Muted:** `#F2EFE9` (Oat White)
* **Ink Primary:** `#191816` (Smoked Obsidian)
* **Ink Secondary:** `#636059` (Muted Warm Stone)
* **Border Hairline:** `#E6E2D8` (Pressed Flax)
* **Primary Brand Accent:** `#1E2B24` (Deep Cypress)
* **Secondary Warm Accent:** `#C27E4B` (Terracotta)
* **Semantic Positive/Calm:** `#2E5A44` (Forest Sage)
* **Semantic Warning/Pending:** `#B87326` (Warm Amber)
* **Semantic Escalation/Urgent:** `#9E2A2B` (Muted Crimson)
* **Typography:**
  * Display / Headers: Serif (`"New York"`, `Georgia`, `Playfair Display`, serif)
  * Interface / Body: Geometric / System Humanist Sans (`Inter`, `-apple-system`, `BlinkMacSystemFont`, sans-serif)

---

## PAGE 1: LANDING PAGE (`/`)

### Block 1.1: Global Navigation Bar
* **Purpose:** Establish brand authority, provide effortless wayfinding, and offer immediate host entry points without friction.
* **Exact Copy:**
  * **Brand Mark:** `AUTOMI` *(All caps, tracked +0.12em)*
  * **Navigation Links:** `The Experience` · `How It Works` · `House Guardrails` · `Portfolio Pricing` · `Journal`
  * **Secondary Action:** `Host Sign In`
  * **Primary Action:** `Begin Complimentary Trial`
* **Layout:**
  * *Desktop (1440px):* Fixed sticky header, 72px height, 12-column grid container with 64px horizontal margin. Left: Brand Mark (Serif, 20px). Center: Nav Links (Sans, 14px, 28px spacing). Right: Action buttons flexed with 16px gap. Backdrop filter: `blur(12px)` over `#F8F6F1` at 85% opacity. Bottom border: 1px solid `#E6E2D8`.
  * *Mobile (390px):* 60px height, 20px padding. Brand Mark left (18px), Hamburger icon (2 lines, Deep Cypress `#1E2B24`) and `Host Sign In` text right. Expanding full-screen linen drawer menu on tap.
* **Styling Notes:**
  * Background: `#F8F6F1` with 85% alpha backdrop blur.
  * Nav link text: `#636059`, hover transition to `#191816` (200ms ease).
  * Primary Button: `#1E2B24` fill, `#F8F6F1` text, 8px rounded corners, padding 10px 20px, font-weight 500, 14px sans. Hover state: background shifts to `#2A3B32` with subtle 2px vertical elevation.

---

### Block 1.2: Hero Section & Conversational Proof Simulator
* **Purpose:** Introduce the value proposition with quiet luxury, paired with an interactive split-screen demo proving how the concierge handles nuanced guest inquiries and escalations.
* **Exact Copy:**
  * **Eyebrow Label:** `Discreet AI Hospitality For Exceptional Homes`
  * **Main Headline:** `Your property, remembered and answered with grace.`
  * **Subheadline:** `AUTOMI provides each of your residences with a private, 24/7 concierge. Guests scan a single card on arrival. Inquiries are resolved instantly from your exact house rules—summoning you only when a human touch is indispensable.`
  * **Primary CTA:** `Create Your Property Concierge`
  * **Secondary CTA:** `Explore an Active Stay Demo`
  * **Micro-Trust Line:** `No credit card required · 14-day hosted trial · Setup takes under 4 minutes`
  * **Interactive Demo Card (4-Message Live Conversation):**
    * *Property Badge:* `The Carriage House at Highclere · Active Guest Session`
    * *Message 1 (Guest — 10:14 PM):* "We just arrived and the fireplace is laid, but we can't seem to locate the chimney flue lever."
    * *Message 2 (Concierge — 10:14 PM):* "Welcome to Highclere, Julian. The cast-iron damper handle is tucked directly inside the upper-right hood of the hearth. Turn it 90 degrees counter-clockwise until it clicks open. You will also find extra cedar kindling in the woven basket to the left of the mantle."
    * *Message 3 (Guest — 10:22 PM):* "Perfect, burning wonderfully. One other question—we love this place. Could we arrange a 1:00 PM late check-out on Sunday?"
    * *Message 4 (Concierge — Escalation Moment — 10:22 PM):* "I'm delighted you are enjoying the hearth. Sunday has an incoming guest arriving at 3:00 PM, so standard housekeeping begins promptly at 11:00 AM. However, I can confirm a complimentary extension to 11:45 AM right now, or safely store your luggage in the front vestibule until 2:00 PM. Would either of those serve your travel plans?"
* **Layout:**
  * *Desktop (1440px):* 2-column asymmetric split (55% left / 45% right), 96px top padding, 80px bottom padding. Left: Eyebrow, Display Serif H1 (56px, line-height 1.15), Subhead (18px sans, line-height 1.6, `#636059`), CTA Button Group (flex-row, 16px gap), Micro-trust footnote. Right: Floating White Card (`#FFFFFF`), 24px padding, 16px border-radius, subtle shadow `0 20px 40px -15px rgba(25, 24, 22, 0.07)`, 1px solid `#E6E2D8`.
  * *Mobile (390px):* Single column stack. Headline 34px Serif. CTA buttons stacked vertically (100% width). Demo card pinned below with horizontal scrollable messages if height exceeds 420px.
* **Styling Notes:**
  * Eyebrow: 12px Sans, tracked +0.15em, uppercase, color `#C27E4B` (Terracotta).
  * Guest Chat Bubbles: Soft wash background `#F2EFE9`, text `#191816`, right-aligned.
  * Concierge Chat Bubbles: White `#FFFFFF` with 1px border `#E6E2D8`, left-aligned, accompanied by a 24px round Deep Cypress monogram avatar (`A`).

---

### Block 1.3: Social Proof Strip
* **Purpose:** Reinforce pedigree and trust through understated metrics and host testimonials from world-class destinations.
* **Exact Copy:**
  * **Section Label:** `Trusted across 1,400+ curated estates, chalets, and boutique residences globally`
  * **Metric 1:** `94.2%` — `Inquiries resolved without host intervention`
  * **Metric 2:** `< 3 sec` — `Average guest response latency`
  * **Metric 3:** `4.98 ★` — `Average host communication rating post-install`
  * **Micro Quote:** *"It has restored our evenings entirely. Our guests feel pampered by an omniscient host, and we haven't received a 11:00 PM Wi-Fi text in six months."*
  * **Quote Attribution:** `— Clara & Henrik van der Bilt, Estate Hosts in Hudson Valley & Cotswolds`
* **Layout:**
  * *Desktop (1440px):* Full-width section on `#F2EFE9`, 64px vertical padding. Top: Centered uppercase label (12px, tracked). Middle: 3-column metric grid with vertical hairline dividers (`#E6E2D8`). Bottom: Centered quote block (Serif 18px italic, max-width 720px).
  * *Mobile (390px):* Stacked 3-tier metrics, center-aligned, with 24px vertical padding each. Quote styled with 16px serif italic and 16px top margin.
* **Styling Notes:**
  * Metric Numbers: 44px Serif Display `#1E2B24`.
  * Metric Labels: 13px Sans `#636059`, uppercase tracking +0.05em.

---

### Block 1.4: How It Works (The 4-Step Hospitality Sequence)
* **Purpose:** Demystify implementation by illustrating how effortless it is for hosts and guests.
* **Exact Copy:**
  * **Section Eyebrow:** `The Method`
  * **Section Headline:** `Flawless execution from arrival to departure.`
  * **Section Subhead:** `Transforming your existing house knowledge into an interactive, elegant guest companion takes minutes.`
  * **Step 01:**
    * *Number:* `01`
    * *Title:* `Curate the House Ledger`
    * *Body:* `Upload your existing house manual, Airbnb listing link, appliance PDFs, or voice notes. AUTOMI ingests every detail—from the HVAC damper trick to your preferred neighborhood bakeries.`
  * **Step 02:**
    * *Number:* `02`
    * *Title:* `Present the Welcome Card`
    * *Body:* `Place our heavy-stock, debossed linen QR card in the entryway, kitchen island, or bedside table. No app download, registration, or guest login required.`
  * **Step 03:**
    * *Number:* `03`
    * *Title:* `Conversations Unfold Naturally`
    * *Body:* `Guests scan and converse in their native language over a high-speed web interface. Every answer reflects your exact hospitality guidelines, tone, and specific house idiosyncrasies.`
  * **Step 04:**
    * *Number:* `04`
    * *Title:* `Summoned Only When Essential`
    * *Body:* `Should a plumbing irregularity occur or a special concession be requested, AUTOMI pages you via instant SMS summary with the guest's context already organized.`
* **Layout:**
  * *Desktop (1440px):* 4-column horizontal card grid. Each card `#FFFFFF`, 32px padding, 12px border radius, 1px solid `#E6E2D8`. Step number in Terracotta `#C27E4B` serif (28px).
  * *Mobile (390px):* Single column vertical stack of 4 cards, 16px vertical gap.
* **Styling Notes:**
  * Step Numbers: Serif, `#C27E4B`.
  * Step Titles: Serif 20px `#191816`.
  * Step Body: Sans 14px, line-height 1.6, `#636059`.

---

### Block 1.5: The "Zero Hallucination / Strict House Policy" Trust Card
* **Purpose:** Address the host's primary fear—that AI will invent rules, promise amenities not provided, or permit unauthorized parties.
* **Exact Copy:**
  * **Section Eyebrow:** `Absolute Fidelity`
  * **Section Headline:** `Strict guardrails. Zero invented promises.`
  * **Section Subhead:** `AUTOMI is hard-bounded by your verified property parameters. It will never invent amenities, authorize unpermitted guests, or contradict your house philosophy.`
  * **Interactive Demonstration Comparison:**
    * *Host Parameter Set:* `Rule 4.2: Maximum 4 registered guests on premises. Strict quiet hours begin at 10:00 PM. No external visitors without prior written approval.`
    * *Guest Inbound Query:* "Hey, we are having 6 friends over for wine and music on the terrace tonight around 10:30 PM, that's fine right?"
    * *AUTOMI Grounded Response:* "I must gently clarify that the property observes strict quiet hours starting at 10:00 PM, and terrace occupancy is limited exclusively to the 4 registered guests named on the reservation. External visitors are not permitted on the premises. We appreciate your cooperation in preserving the tranquility of our residential neighborhood."
  * **Security Bullet 1:** `Strict Data Boundary` — `Your property knowledge base is private, encrypted, and isolated.`
  * **Security Bullet 2:** `Automated Rule Enforcement` — `Violations of party rules or occupancy policies trigger instant polite boundary enforcement and an urgent host notification.`
  * **Security Bullet 3:** `Instant Host Override` — `Jump into any live chat thread directly from your phone with a single tap.`
* **Layout:**
  * *Desktop (1440px):* 2-column card. Left: Headline and 3 Security Bullets with Deep Cypress tick marks. Right: High-contrast split UI card showing the exact prompt vs. grounded response comparison on `#1E2B24` (Deep Cypress background) with crisp white/sand text.
  * *Mobile (390px):* Stacked layout. Headline -> Comparison card -> Security bullets below.
* **Styling Notes:**
  * Deep Cypress Card: Background `#1E2B24`, border 1px solid rgba(255,255,255,0.1), text `#F8F6F1`, accent highlights in Terracotta `#C27E4B`.

---

### Block 1.6: Features Suite (Hospitality-First Architecture)
* **Purpose:** Detail the specialized capabilities tailored to boutique short-term rental management.
* **Exact Copy:**
  * **Section Eyebrow:** `Capabilities`
  * **Section Headline:** `Engineered for the demands of high-touch properties.`
  * **Card 1:**
    * *Title:* `The Living House Manual`
    * *Body:* `Understands intricate mechanical setups: Sonos zones, hydronic radiant heat, hot tub sanitation cycles, and vintage kitchen ranges with absolute clarity.`
  * **Card 2:**
    * *Title:* `Frictionless Language Parity`
    * *Body:* `Instantly converses in 38 languages. A guest asking in Japanese or French receives an immediate, culturally gracious reply in their native tongue.`
  * **Card 3:**
    * *Title:* `Intelligent SMS Escalation`
    * *Body:* `Filters out 95% of routine questions. Only genuine emergencies or bespoke requests trigger an SMS alert to your personal mobile device.`
  * **Card 4:**
    * *Title:* `Curated Local Concierge`
    * *Body:* `Recommends your favored hidden bakeries, local sommeliers, private hiking trails, and emergency medical clinics with host-vetted descriptions.`
  * **Card 5:**
    * *Title:* `Arrival & Departure Coordination`
    * *Body:* `Proactively guides lockbox or smart-lock entry upon arrival, and confirms departure checklists (linens, thermostats, key return) without host friction.`
  * **Card 6:**
    * *Title:* `Instant Wi-Fi & Device Telemetry`
    * *Body:* `Provides 1-tap network connection strings and step-by-step diagnostic workflows if the internet or cable television ever hiccups.`
* **Layout:**
  * *Desktop (1440px):* 3x2 Grid (6 cards), 32px gap. Each card: `#FFFFFF`, 36px padding, 12px border radius, 1px solid `#E6E2D8`.
  * *Mobile (390px):* 1-column stack of 6 cards with 16px gap.
* **Styling Notes:**
  * Card Titles: Serif 20px `#191816`.
  * Card Body: Sans 14px `#636059`, line-height 1.6.
  * Card Hover: Border color transitions to `#C27E4B` with subtle 4px elevation.

---

### Block 1.7: Transparent Portfolio Pricing
* **Purpose:** Provide clear, transparent pricing tiers named after hospitality categories.
* **Exact Copy:**
  * **Section Eyebrow:** `Investment`
  * **Section Headline:** `Predictable pricing for distinguished portfolios.`
  * **Section Subhead:** `All tiers include unlimited guest conversations, complete customization, multi-language translation, and physical welcome cards.`
  * **Tier 1 (The Pied-à-Terre Collection):**
    * *Price:* `$29` `/ month`
    * *Target:* `For hosts managing up to 3 individual residences.`
    * *Features Included:*
      * `Up to 3 active properties`
      * `Unlimited guest conversations`
      * `Automated multi-language engine (38 languages)`
      * `SMS emergency escalation to 1 host phone`
      * `Standard printable linen QR collateral templates`
    * *CTA:* `Begin with Starter`
  * **Tier 2 (The Estate Portfolio — Most Favored):**
    * *Badge:* `Most Favored by Boutique Operators`
    * *Price:* `$79` `/ month`
    * *Target:* `For growing portfolios up to 10 curated residences.`
    * *Features Included:*
      * `Up to 10 active properties`
      * `Everything in Starter, plus:`
      * `SMS routing to multiple team members (Cleaners/Co-hosts)`
      * `Custom branding & personalized concierge tone`
      * `Complimentary debossed linen welcome cards shipped to you`
      * `Priority ingestion & rule audit by our hospitality team`
    * *CTA:* `Select Professional Tier`
  * **Tier 3 (The Hospitality Atelier):**
    * *Price:* `$199` `/ month`
    * *Target:* `For luxury management firms managing up to 30 estates.`
    * *Features Included:*
      * `Up to 30 active properties`
      * `Everything in Professional, plus:`
      * `Direct PMS & calendar integration (Guesty, Hospitable, Hostaway)`
      * `Custom domain for guest portal (e.g., concierge.yourbrand.com)`
      * `Dedicated account concierge & quarterly rule refinement`
      * `Custom multi-tier emergency routing rules`
    * *CTA:* `Inquire for Atelier`
* **Layout:**
  * *Desktop (1440px):* 3-column comparative layout. Center card (Tier 2) elevated by 16px with deep cypress accent border (2px `#1E2B24`) and badge pinned at the top.
  * *Mobile (390px):* Stacked 3 tiers with Tier 2 displayed first or highlighted.
* **Styling Notes:**
  * Card 1 & 3: Background `#FFFFFF`, border 1px solid `#E6E2D8`.
  * Card 2 (Professional): Background `#FFFFFF`, border 2px solid `#1E2B24`, subtle box-shadow `0 20px 40px -10px rgba(30, 43, 36, 0.12)`.
  * CTA Button for Tier 2: Solid Deep Cypress `#1E2B24` with White `#FFFFFF` text. CTA for Tier 1 & 3: Muted Linen wash `#F2EFE9` with Cypress `#1E2B24` text.

---

### Block 1.8: Frequently Answered Inquiries (Host Objections)
* **Purpose:** Dismantle specific operational concerns with definitive, reassuring answers.
* **Exact Copy:**
  * **Section Eyebrow:** `Clarity`
  * **Section Headline:** `Common questions from discerning hosts.`
  * **FAQ Item 1:**
    * *Question:* `Will AUTOMI ever hallucinate details or promise early check-in without my permission?`
    * *Answer:* `Never. AUTOMI operates strictly on closed-domain grounded retrieval. It is programmatically prohibited from approving policy exceptions, early arrivals, late check-outs, or unauthorized guests. When an unsupported request arises, it politely sets expectations and escalates the decision directly to you.`
  * **FAQ Item 2:**
    * *Question:* `What transpires if a critical emergency occurs, like a burst pipe at 2:00 AM?`
    * *Answer:* `AUTOMI immediately recognizes critical severity keywords (water leak, power outage, smoke, security concerns). It instantly provides the guest with your documented emergency shut-off locations or first-responder contacts, and simultaneously sends an urgent high-priority SMS alert to your telephone.`
  * **FAQ Item 3:**
    * *Question:* `How much effort is required to import my house information?`
    * *Answer:* `Under four minutes per property. You can paste your existing Airbnb or VRBO listing URL, upload a PDF guide, or drop in raw bullet points. Our ingestion engine parses your content into an organized, queryable knowledge architecture automatically.`
  * **FAQ Item 4:**
    * *Question:* `Do my guests have to download an application or sign up?`
    * *Answer:* `No. Guests simply point their standard smartphone camera at the printed tabletop card. A blazing-fast, elegant mobile web page launches instantly. There are zero apps to install, accounts to create, or passwords to enter.`
  * **FAQ Item 5:**
    * *Question:* `Does this diminish the personal warmth and charm of my hosting?`
    * *Answer:* `Hosts tell us it does the exact opposite. Because AUTOMI is tailored to your exact voice, recommendations, and warmth, guests receive immediate, gracious answers instead of waiting 45 minutes for a text reply. You are freed to focus on genuine, high-impact hospitality.`
* **Layout:**
  * *Desktop (1440px):* Single column accordion container, max-width 840px, centered. Accordions styled with 1px bottom border `#E6E2D8`, 24px vertical padding per question.
  * *Mobile (390px):* Full-width single column accordion with touch-friendly 48px hit areas.
* **Styling Notes:**
  * Question: Serif 18px `#191816`, flex row with `+` / `−` icon in Terracotta `#C27E4B`.
  * Answer: Sans 15px `#636059`, line-height 1.65, 12px top padding.

---

### Block 1.9: Final Invitation & Conversion Card
* **Purpose:** High-impact, warm closing invitation driving immediate trial activation.
* **Exact Copy:**
  * **Headline:** `Grant your residences the voice they deserve.`
  * **Subheadline:** `Join over 1,400 hosts who have reclaimed their peace of mind while elevating the guest experience.`
  * **Primary CTA:** `Begin 14-Day Hosted Trial`
  * **Secondary Text:** `Complimentary setup assistance · No credit card required · Instant card generation`
* **Layout:**
  * *Desktop (1440px):* Contained full-width banner with `#1E2B24` (Deep Cypress) background, 80px vertical padding, centered content, 16px border-radius.
  * *Mobile (390px):* Full-width flush container, 48px padding, stacked button.
* **Styling Notes:**
  * Background: `#1E2B24`
  * Headline: 40px Serif Display `#F8F6F1`.
  * Subheadline: 16px Sans `rgba(248, 246, 241, 0.8)`.
  * CTA Button: `#C27E4B` (Terracotta) fill, `#FFFFFF` text, 12px 28px padding, 15px sans font-weight 600. Hover: `#D48D59`.

---

### Block 1.10: Global Footer
* **Purpose:** Understated brand closure, navigation, compliance, and language switcher.
* **Exact Copy:**
  * **Brand Column:** `AUTOMI` — `Quiet luxury guest concierge systems for boutique hospitality portfolios.`
  * **Column 1 (Product):** `The Concierge` · `House Manual Engine` · `Multi-Language Parity` · `Security & Guardrails` · `Print Collateral`
  * **Column 2 (Management):** `Boutique Hosts` · `Estate Portfolios` · `Property Managers` · `Case Studies`
  * **Column 3 (Company):** `The Atelier` · `Hospitality Journal` · `House Guidelines` · `Direct Contact`
  * **Bottom Bar Left:** `© 2025 AUTOMI Hospitality Technologies Inc. All rights reserved.`
  * **Bottom Bar Right:** `Privacy Policy` · `Terms of Service` · `Security Architecture`
* **Layout:**
  * *Desktop (1440px):* 4-column layout top, 1px top border `#E6E2D8`, 64px padding-top, 40px padding-bottom. Bottom sub-bar with space-between alignment.
  * *Mobile (390px):* Stacked columns with 24px spacing, bottom legal links stacked.
* **Styling Notes:**
  * Background: `#F8F6F1`
  * Links: Sans 13px `#636059`, hover `#191816`.
  * Legal Text: Sans 12px `#8A8780`.

---

## PAGE 2: AUTHENTICATION (`/login`)

### Block 2.1: Authentication Split Screen
* **Purpose:** Provide a tranquil, friction-free host login via Google OAuth or passwordless Email OTP.
* **Exact Copy:**
  * **Left Visual Panel (Desktop only):**
    * *Property Imagery:* High-resolution serene architectural interior of a sunlit stone cottage living room.
    * *Overlay Quote:* *"Hospitality is present when something happens for you, not to you."*
    * *Quote Attribution:* `— The AUTOMI House Standard`
  * **Right Authentication Container:**
    * *Brand Monogram:* `AUTOMI`
    * *Title:* `Welcome back to your properties`
    * *Subtitle:* `Access your active concierge dashboards and live guest sessions.`
    * *Google Auth Button:* `Continue with Google Account`
    * *Divider:* `— or sign in via discreet email code —`
    * *Email Field Label:* `Host Email Address`
    * *Email Placeholder:* `e.g. eleanor@highclere-estates.com`
    * *Email CTA Button:* `Send Access Code`
    * *Micro-Notice:* `We will transmit a 6-digit verification code to your inbox. No passwords required.`
  * **OTP Entry View (State 2 upon email dispatch):**
    * *Title:* `Check your correspondence`
    * *Subtitle:* `We have dispatched a 6-digit access code to {hostEmail}.`
    * *Input Label:* `Verification Code`
    * *Code Placeholder:* `· · · · · ·`
    * *Verify CTA Button:* `Confirm & Enter Atelier`
    * *Resend Link:* `Did not receive code? Request another in 0:42`
    * *Back Link:* `← Use a different email address`
* **Layout:**
  * *Desktop (1440px):* 50/50 split screen. Left side: Atmospheric full-bleed image with Deep Cypress scrim and serif quote pinned at bottom. Right side: Centered auth card (420px max-width) in French Linen canvas `#F8F6F1`.
  * *Mobile (390px):* Single column centered layout on `#F8F6F1`, 24px padding. Top brand mark -> Title -> Google Button -> OTP Form.
* **Styling Notes:**
  * Input Fields: Background `#FFFFFF`, border 1px solid `#E6E2D8`, 12px padding, 8px border-radius, font-size 15px `#191816`. Focus: Border `#1E2B24`, ring 2px `rgba(30, 43, 36, 0.08)`.
  * Google Auth Button: Background `#FFFFFF`, 1px solid `#E6E2D8`, 14px font-weight 500 `#191816`, 12px vertical padding.

---

## PAGE 3: ONBOARDING WIZARD (`/onboarding`)

### Block 3.1: Step 0 — Welcome Screen
* **Purpose:** Ground the host in the ease of the process and initiate the property intake.
* **Exact Copy:**
  * **Step Progress Indicator:** `Step 1 of 5 · Property Genesis`
  * **Headline:** `Let us introduce your property to its voice.`
  * **Subheadline:** `In four brief moments, we will transform your house notes into a polished 24/7 guest companion.`
  * **Primary CTA:** `Begin Setup`
  * **Time Estimate:** `Takes approximately 3 to 4 minutes.`
* **Layout & Styling:**
  * Centered standalone modal card `#FFFFFF`, 48px padding, 16px radius, subtle shadow. Canvas `#F8F6F1`. Headline: Serif 32px `#191816`.

---

### Block 3.2: Step 1 — Identity & Listing Intake
* **Purpose:** Ingest property name and existing Airbnb/VRBO URL or house guide.
* **Exact Copy:**
  * **Question 1 Title:** `What is the official name of this residence?`
  * **Question 1 Subtitle:** `This will appear on the guest welcome card and digital portal.`
  * **Field 1 Placeholder:** `e.g. The Cotswold Stone Cottage`
  * **Question 2 Title:** `Import your existing listing or manual`
  * **Question 2 Subtitle:** `Paste your Airbnb link, VRBO URL, or upload a PDF. We automatically extract your amenities, check-in instructions, and rules.`
  * **Field 2 Placeholder:** `https://airbnb.com/rooms/...`
  * **File Upload Dropzone:** `Drag & drop your Welcome PDF or house notes here (Max 25MB)`
  * **Navigation:** `Next: Define Concierge Voice →`

---

### Block 3.3: Step 2 — Concierge Voice & Temperament
* **Purpose:** Configure the conversational persona to align with property aesthetics.
* **Exact Copy:**
  * **Step Title:** `Select the conversational tone for this property.`
  * **Step Subtitle:** `How should your concierge greet and converse with your guests?`
  * **Option 1 (Discreet Grandeur):**
    * *Title:* `Discreet Grandeur`
    * *Description:* `Formal, impeccably polite, traditional luxury boutique style. Uses phrases like 'delighted to assist' and 'at your convenience.'`
  * **Option 2 (Warm Modernist — Recommended):**
    * *Title:* `Warm Modernist`
    * *Description:* `Gracious, friendly, concise, and effortlessly knowledgeable. Relaxed yet deeply attentive.`
  * **Option 3 (Rustic Local Insider):**
    * *Title:* `Rustic Local Insider`
    * *Description:* `Charming, cozy, highly focused on artisanal recommendations, nature, and neighborhood lore.`
  * **Navigation:** `← Back` · `Next: Guardrails & Rules →`

---

### Block 3.4: Step 3 — Critical Guardrails & Unbreakable Rules
* **Purpose:** Ensure the AI strictly enforces hard boundaries (noise, occupancy, parking, pets).
* **Exact Copy:**
  * **Step Title:** `Specify your unbreakable house rules.`
  * **Step Subtitle:** `AUTOMI will strictly safeguard these parameters and will never make concessions without host approval.`
  * **Rule Field 1 (Quiet Hours):**
    * *Label:* `Quiet Hours Window`
    * *Placeholder:* `e.g. 10:00 PM – 8:00 AM daily`
  * **Rule Field 2 (Occupancy Limits):**
    * *Label:* `Maximum Approved Guests on Premises`
    * *Placeholder:* `e.g. 4 registered guests maximum. Strictly no unregistered visitors.`
  * **Rule Field 3 (Pets & Smoking):**
    * *Label:* `Smoking & Pet Regulations`
    * *Placeholder:* `e.g. Strictly non-smoking anywhere on property. Hypoallergenic dogs allowed with prior fee.`
  * **Navigation:** `← Back` · `Next: Emergency Escalation →`

---

### Block 3.5: Step 4 — Emergency Routing & Host Contact
* **Purpose:** Connect host phone number for SMS escalation triggers.
* **Exact Copy:**
  * **Step Title:** `Where should we alert you when a human touch is needed?`
  * **Step Subtitle:** `When urgent issues occur (leaks, lockouts, or policy violations), AUTOMI immediately sends an SMS summary to this number.`
  * **Field 1 Label:** `Primary Host Mobile Phone (for instant SMS alerts)`
  * **Field 1 Placeholder:** `+1 (555) 234-5678`
  * **Field 2 Label:** `Secondary Contact or Co-Host (Optional)`
  * **Field 2 Placeholder:** `+1 (555) 987-6543`
  * **Navigation:** `← Back` · `Complete & Preview Concierge →`

---

### Block 3.6: Step 5 — Finish Screen & Property Activation
* **Purpose:** Celebrate completion, provide instant QR download, and allow a test message.
* **Exact Copy:**
  * **Step Badge:** `Concierge Ready & Deployed`
  * **Headline:** `The Cotswold Stone Cottage is now in good hands.`
  * **Subheadline:** `Your house knowledge has been ingested and audited. Your guest portal is live and ready for arrival day.`
  * **Action Card 1 (Printable QR Card):**
    * *Title:* `Download Welcome Card Collateral`
    * *Description:* `Print your bespoke 4x6 tabletop card or save high-resolution PDF for framing.`
    * *CTA:* `Download Print PDF`
  * **Action Card 2 (Interactive Test):**
    * *Title:* `Conduct a Test Conversation`
    * *Description:* `Try asking about the fireplace, Wi-Fi, or late check-out to see how your concierge responds.`
    * *CTA:* `Launch Test Simulation`
  * **Primary Bottom CTA:** `Enter Host Dashboard (Today)`
* **Layout & Styling:**
  * Two-card horizontal split on `#FFFFFF` inside `#F8F6F1` canvas. Accent badge in Forest Sage `#2E5A44` with white text.

---

## PAGE 4: HOST DASHBOARD (`/dashboard/today`)

### Block 4.1: Dashboard Top Navigation & Status Bar
* **Purpose:** Contextual workspace navigation with property switcher and live operational status.
* **Exact Copy:**
  * **Left:** `AUTOMI Atelier` · `Property Selector: All Properties (3)`
  * **Center Nav:** `Today` · `Live Sessions` · `Knowledge Ledger` · `Collateral` · `Settings`
  * **Right:** `Emergency Status: Normal` · `Host Profile: Eleanor Vance`

---

### Block 4.2: Dynamic Day-Part Greeting & Executive Summary
* **Purpose:** Welcome host with calm, context-aware overview of portfolio activity.
* **Exact Copy (Dynamic Variants):**
  * **Morning Variant (06:00 – 11:59):**
    * *Headline:* `Good morning, Eleanor.`
    * *Subheadline:* `All three residences are peaceful. Two check-outs scheduled for 11:00 AM at Highclere and The Barn.`
  * **Afternoon Variant (12:00 – 17:59):**
    * *Headline:* `Good afternoon, Eleanor.`
    * *Subheadline:* `Turnover underway across 2 properties. Check-in instructions dispatched for incoming guests arriving at 3:00 PM.`
  * **Evening Variant (18:00 – 05:59):**
    * *Headline:* `Good evening, Eleanor.`
    * *Subheadline:* `All guests are checked in. Zero active escalations. Quiet hours start in 2 hours.`
* **Layout & Styling:**
  * Headline: 32px Serif Display `#191816`.
  * Subheadline: 15px Sans `#636059`.
  * 32px bottom margin to stats strip.

---

### Block 4.3: The Three Vital Hospitality Metrics
* **Purpose:** Provide immediate high-level reassurance of concierge efficacy.
* **Exact Copy:**
  * **Metric Card 1:**
    * *Value:* `7`
    * *Label:* `Active In-Stay Guests`
    * *Subtext:* `Across 3 residences · 0 inquiries pending`
  * **Metric Card 2:**
    * *Value:* `96.4%`
    * *Label:* `Resolved Autonomously`
    * *Subtext:* `27 of 28 inquiries handled without host interruption`
  * **Metric Card 3:**
    * *Value:* `0 min`
    * *Label:* `Mean Escalation Latency`
    * *Subtext:* `1 SMS alert dispatched this week (resolved in 4 mins)`
* **Layout:**
  * *Desktop (1440px):* 3-card horizontal grid, 20px gap. Each card `#FFFFFF`, 24px padding, 10px radius, 1px solid `#E6E2D8`.
  * *Mobile (390px):* 3 stacked cards or swipeable carousel.

---

### Block 4.4: The "Needs Attention" Escalation Card (Urgent State)
* **Purpose:** Highlight conversations that require host review or decision.
* **Exact Copy:**
  * *State: Displayed only when an escalation occurs.*
  * **Card Header Badge:** `Escalation Pending Host Confirmation` *(Crimson pill: `#9E2A2B` fill, `#FFFFFF` text)*
  * **Property:** `The Carriage House at Highclere · Julian Montgomery`
  * **Incident Summary:** `Guest requested late check-out on Sunday at 1:00 PM. Concierge offered standard 11:45 AM extension or luggage drop due to 3:00 PM arrival turnaround. Guest asks if they can pay a fee for 1:00 PM.`
  * **Action Required:** `Approve exception, decline, or message guest directly.`
  * **Button 1 (Primary Action):** `Authorize 1:00 PM Extension ($45 Fee)`
  * **Button 2 (Secondary Action):** `Keep 11:45 AM Standard Limit`
  * **Button 3 (Direct Contact):** `Take Over Live Chat`
* **Layout & Styling:**
  * Card Background: `#FFFDFC`, border: 1.5px solid `#9E2A2B`, 24px padding, 12px radius. Box shadow: `0 8px 24px -6px rgba(158, 42, 43, 0.08)`.

---

### Block 4.5: The "All-Quiet" State (Peace of Mind View)
* **Purpose:** Provide reassuring feedback when no host action is needed.
* **Exact Copy:**
  * *State: Displayed when no escalations are pending.*
  * **Badge:** `Portfolio Status: Serene` *(Forest Sage `#2E5A44`)*
  * **Headline:** `All residences are running without friction.`
  * **Body:** `Your house concierges have answered 14 inquiries today (radiator adjustments, Wi-Fi network confirmation, and breakfast recommendations). No host actions required.`
* **Layout & Styling:**
  * Card Background: `#FFFFFF`, 1px solid `#E6E2D8`, 24px padding, flex row with Forest Sage status pulse indicator.

---

### Block 4.6: Active Properties Portfolio Grid
* **Purpose:** Display property-by-property operational snapshot.
* **Exact Copy:**
  * **Property Card 1:**
    * *Name:* `The Cotswold Stone Cottage`
    * *Status:* `Occupied · Guest: Sophia Lorenzen (Night 2/4)`
    * *Last Interaction:* `18 mins ago · "Where are the extra fireplace matches?" → Resolved`
    * *Actions:* `View Live Ledger` · `Print Collateral` · `Settings`
  * **Property Card 2:**
    * *Name:* `The Carriage House at Highclere`
    * *Status:* `Occupied · Guest: Julian Montgomery (Night 1/3)`
    * *Last Interaction:* `42 mins ago · Late check-out inquiry → Escalation Pending`
    * *Actions:* `Resolve Escalation` · `View Live Ledger` · `Settings`
  * **Property Card 3:**
    * *Name:* `The Hudson Valley Glasshouse`
    * *Status:* `Vacant · Next Check-in Tomorrow at 3:00 PM`
    * *Last Interaction:* `Yesterday 4:15 PM · Departure checklist completed`
    * *Actions:* `View Preparation Ledger` · `Print Collateral` · `Settings`
* **Layout:**
  * *Desktop (1440px):* 3-column card grid.
  * *Mobile (390px):* 1-column stack.

---

## PAGE 5: GUEST DIGITAL CONCIERGE (`/stay/{propertySlug}`)

*Note: This is the zero-install mobile web application loaded instantly when a guest scans the physical QR card.*

### Block 5.1: Concierge Header
* **Purpose:** Establish property identity, host reassurance, and live availability.
* **Exact Copy:**
  * **Top Property Title:** `{propertyName}` *(e.g. The Cotswold Stone Cottage)*
  * **Concierge Monogram & Avatar:** Discreet circle with `A` in Deep Cypress `#1E2B24`.
  * **Host Sub-badge:** `Hosted by Eleanor Vance · 24/7 Digital Concierge`
  * **Live Status Pill:** `● Online & Answering from Private House Ledger`
* **Layout (Mobile 390px Viewport):**
  * Sticky top bar, 68px height, French Linen background `#F8F6F1` with 1px bottom border `#E6E2D8`. Centered typography: Serif 16px title, Sans 12px status pill in Forest Sage `#2E5A44`.

---

### Block 5.2: Dynamic Opening Welcome Message
* **Purpose:** Greet the guest warmly with arrival-specific context.
* **Exact Copy:**
  * **Concierge Bubble 1:** `Good afternoon, and welcome to {propertyName}. I am your private digital concierge, trained on Eleanor's specific guidance for this residence.`
  * **Concierge Bubble 2:** `Whether you need the Wi-Fi credentials, instructions for the hydronic heating, or our favored neighborhood dining tables—simply ask below at any hour.`
* **Layout & Styling:**
  * Left-aligned chat card in Crisp White `#FFFFFF`, 16px padding, 14px radius with bottom-left anchor, 1px solid `#E6E2D8`. Typography: Sans 15px `#191816`, line-height 1.5.

---

### Block 5.3: Quick-Tap Action Pills (Instant Queries)
* **Purpose:** Allow 1-tap resolution for the four most common guest questions without typing.
* **Exact Copy:**
  * **Pill 1:** `📶 Wi-Fi Passcode`
  * **Pill 2:** `🔥 Hearth & Heating Guide`
  * **Pill 3:** `☕ Coffee Machine Setup`
  * **Pill 4:** `🍷 Eleanor's Dining List`
  * **Pill 5:** `🕒 Check-out Checklist`
* **Layout (Mobile 390px):**
  * Horizontally scrollable pill strip immediately below the welcome message. 12px vertical padding. Pills styled as `#FFFFFF` with 1px solid `#E6E2D8`, 8px 14px padding, 13px sans `#191816`, border-radius 20px. Active tap state: `#1E2B24` with `#FFFFFF` text.

---

### Block 5.4: Conversational Stream & Grounded Responses
* **Purpose:** Deliver precise, gracious answers grounded exclusively in the property ledger.
* **Example Live Exchange (Exact Copy):**
  * **Guest Query:** "How do we get the Sonos sound system to play in the outdoor garden terrace?"
  * **Concierge Response:** "To play music on the garden terrace:
    1. Ensure your device is connected to the 'Highclere_Guest' 5GHz Wi-Fi.
    2. Open Spotify, Apple Music, or AirPlay and select the output named 'Garden & Pergola'.
    3. The volume is limited to 65% after 9:30 PM to honor our neighborhood quiet hours. Enjoy your evening outdoors."
  * **Trust Attribution Footnote:** `✓ Answered directly from Eleanor's Verified House Ledger`

---

### Block 5.5: Escalation Handoff Message
* **Purpose:** Smoothly transition complex issues to the host without breaking trust.
* **Exact Copy:**
  * *State: Triggered when a guest reports a physical fault or asks for an unauthorized exception.*
  * **Concierge Message:** "I want to ensure this is handled with absolute care. I have informed Eleanor directly via priority SMS with your note regarding the radiator pressure. She or our estate manager will message you directly here or via your mobile within a few minutes."
  * **Status Card:** `Priority Host Notification Dispatched · Host response expected shortly`

---

### Block 5.6: Guest Input Footer
* **Purpose:** Clean, accessible input field with voice and text capabilities.
* **Exact Copy:**
  * **Input Placeholder:** `Ask anything about your stay at {propertyName}...`
  * **Send Button:** `Send arrow icon (Deep Cypress)`
  * **Under-text:** `Powered by AUTOMI Private Hospitality System · End-to-end encrypted`
* **Layout (Mobile 390px):**
  * Fixed bottom input bar, 80px height (accounting for safe area). `#FFFFFF` input field with 1px solid `#E6E2D8`, 24px border radius.

---

## PAGE 6: PHYSICAL WELCOME QR CARD (4x6 Tabletop Print Collateral)

*Note: Designed for standard 4" x 6" portrait heavy debossed uncoated linen cardstock (350 GSM, French Linen tone).*

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│                       AUTOMI                           │
│                 HOSPITALITY SYSTEM                     │
│                                                        │
│                                                        │
│           THE COTSWOLD STONE COTTAGE                   │
│                                                        │
│               ────────────────────                     │
│                                                        │
│            Your 24/7 Digital Concierge                 │
│                                                        │
│                                                        │
│                 ┌────────────────┐                     │
│                 │ ┌────────────┐ │                     │
│                 │ │ █▀▀▀█ ▄▄ █ │ │                     │
│                 │ │ █ ▀ █ ▄▀ █ │ │                     │
│                 │ │ ▀▀▀▀▀ ▀▀ ▀ │ │                     │
│                 │ └────────────┘ │                     │
│                 └────────────────┘                     │
│                 SCAN FOR ASSISTANCE                    │
│                                                        │
│                                                        │
│          Point your smartphone camera here             │
│        to access instant house guidance, Wi-Fi,        │
│          heating controls, and host-curated            │
│               dining recommendations.                  │
│                                                        │
│               ────────────────────                     │
│                                                        │
│          Direct Host Line: +1 (555) 234-5678           │
│           Wi-Fi Network: Highclere_Guest               │
│                                                        │
│                                                        │
│   NO APPLICATION DOWNLOAD OR REGISTRATION REQUIRED     │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Card Front Layout & Typography Details

#### 1. Header Block
* **Brand Wordmark:** `AUTOMI`
  * *Typography:* Serif, All Caps, 9pt, Tracking +0.2em, Color: `#636059` (Muted Stone).
* **Subtitle:** `HOSPITALITY SYSTEM`
  * *Typography:* Sans, All Caps, 6pt, Tracking +0.15em, Color: `#8A8780`.
* *Spacing:* 24pt from top edge of card.

#### 2. Property Title Block
* **Property Name:** `{propertyName}` *(e.g. The Cotswold Stone Cottage)*
  * *Typography:* Serif Display, Title Case, 18pt, Line-height 1.2, Color: `#191816` (Smoked Obsidian).
* **Decorative Hairline:** 40pt width, 0.5pt stroke, Color: `#C27E4B` (Terracotta).
* **Role Subtitle:** `Your 24/7 Digital Concierge`
  * *Typography:* Sans, 9.5pt, Font-weight 400, Color: `#636059`.
* *Spacing:* 16pt below header block.

#### 3. QR Focal Block
* **QR Container:** 1.75" x 1.75" (126pt square).
* **QR Styling:** Crisp high-contrast Deep Cypress `#1E2B24` modules on Pure White background `#FFFFFF`, surrounded by a 1pt Hairline border `#E6E2D8` with 6pt corner radius. Terracotta `#C27E4B` alignment corner markers.
* **Scan Label Below QR:** `SCAN FOR ASSISTANCE`
  * *Typography:* Sans, All Caps, 7pt, Tracking +0.18em, Font-weight 600, Color: `#1E2B24`.
* *Spacing:* Centered vertically on card.

#### 4. Instruction Copy Block
* **Body Text:**
  * *"Point your smartphone camera here to access instant house guidance, Wi-Fi, heating controls, and host-curated dining recommendations."*
  * *Typography:* Sans, Regular, 8pt, Line-height 1.45, Max-width 180pt, Centered, Color: `#636059`.

#### 5. Fallback & Essential Access Block
* **Decorative Divider:** 120pt width, 0.5pt stroke `#E6E2D8`.
* **Line 1:** `Direct Host Emergency Line: {hostPhoneNumber}`
  * *Typography:* Sans, 7.5pt, Font-weight 500, Color: `#191816`.
* **Line 2:** `Wi-Fi Network: {wifiNetworkName} · Password on Portal`
  * *Typography:* Sans, 7.5pt, Font-weight 400, Color: `#636059`.

#### 6. Footer Disclaimer
* **Microcopy:** `NO APPLICATION DOWNLOAD OR REGISTRATION REQUIRED`
  * *Typography:* Sans, All Caps, 5.5pt, Tracking +0.12em, Color: `#8A8780`.
* *Spacing:* Pinned 18pt above bottom edge.

---

### Card Back Specifications (Optional Double-Sided Print)
* **Header:** `House Essentials at a Glance`
* **Content:**
  * `1. Arrival & Key Return:` *Check-in is 3:00 PM · Departure is 11:00 AM promptly.*
  * `2. Quiet Hours:` *10:00 PM to 8:00 AM daily. Please respect our neighbors.*
  * `3. Waste & Recycling:` *Compost and recyclables are situated in the cedar shed near the gate.*
  * `4. Emergency Assistance:` *For fire, medical, or immediate hazard, dial 911 immediately, then notify host.*
* **Footer:** `AUTOMI · Crafted for Discerning Properties`

---

## IMPLEMENTATION DESIGN CHECKLIST FOR DEVELOPERS

| Token Name | Hex Code | Usage |
| :--- | :--- | :--- |
| `--canvas-bg` | `#F8F6F1` | Global body background, app canvas, card backdrops |
| `--surface-white` | `#FFFFFF` | Core interactive cards, input fields, QR background |
| `--surface-muted` | `#F2EFE9` | Guest chat bubbles, subtle strip backgrounds |
| `--ink-primary` | `#191816` | Main headers, display titles, primary body copy |
| `--ink-secondary` | `#636059` | Subheadlines, secondary descriptions, metadata |
| `--border-hairline` | `#E6E2D8` | Structural 1px card borders, dividers, subtle separators |
| `--brand-cypress` | `#1E2B24` | Primary buttons, active tabs, brand headers, hero dark card |
| `--brand-terracotta` | `#C27E4B` | Eyebrow text, secondary accents, notification indicators |
| `--status-sage` | `#2E5A44` | "All-quiet" indicators, online badges, success alerts |
| `--status-amber` | `#B87326` | Non-urgent host review badges, pending checkouts |
| `--status-crimson` | `#9E2A2B` | Urgent emergency alerts, policy escalation notifications |

*All typography falls back to `Georgia, "Times New Roman", serif` for Serif headers and `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` for Interface Sans body.*