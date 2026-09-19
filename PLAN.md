# AI Operations Manager for Short-Term Rentals — Build Plan

## Product (MVP scope)

Property → Reservation → Guest AI Chat → Host Dashboard → Automated Operations.
No WhatsApp, no Airbnb API in Phase 1. Web chat link + email reach the guest.

## Honest assessment

**Strong points**
- Real, painful, repeated problem: 60–70% of guest messages are the same 10 questions.
- Right target customer: property managers with 10–100+ listings feel the pain at scale and can pay $79–$199+/mo.
- Deferring WhatsApp and the Airbnb API is the correct sequencing.
- "10 strangers paying" is the right first milestone.

**Main risks**
1. **Guest link adoption (biggest MVP risk).** Guests get phishing links daily and may ignore/report a chat URL. Mitigations: send the link from the host's own Airbnb/Booking message thread (host copies a snippet), consistent branded domain, QR code on the fridge/ welcome sheet in the property, AI also available as a "reply suggester" the host pastes into Airbnb.
2. **Airbnb API is gated in Phase 2.** New partner access is heavily restricted and slow. Bridge: iCal (ICS) sync — every channel exports it — plus manual entry. Apply for API access early; expect to wait.
3. **AI overstepping.** The AI must never promise refunds, approve late checkout outside the rules, or guess on safety/emergencies. Hard guardrails + one-click escalation + full transcript visible to host.
4. **Competitors exist** (HostAI, Hospitable, Guesty AI features). Differentiate on: cleaner ops + property status in one loop, simple setup, price at scale. Speed to 10 customers beats feature depth now.

## What reaches the guest in Phase 1 (the gap in the original plan)

- **Email automation** (Resend/Postmark): welcome, check-in instructions, checkout instructions — each containing the unique chat link. Guest email comes from the reservation record.
- **Copy-paste snippets** for the host: the same messages formatted to paste into Airbnb's message thread.
- **QR code in the property** linking to the guest's session (token valid for the stay).

## Reservations without the Airbnb API

- ICS/iCal URL per property (Airbnb, Booking, VRBO all export these). Sync every 1–6 hours → auto-create/update reservations.
- Manual add/edit form as fallback.

## Data model (core tables)

- `organizations` (host company) → `users` (staff) → `properties`
- `property_knowledge` (structured fields: wifi, checkin/checkout times, parking, appliances, house rules, directions, amenities, emergency info, nearby places, late-checkout policy, cleaning notes; plus free-text extras)
- `reservations` (guest name, email, phone, dates, channel, status, `chat_token`)
- `conversations` / `messages` (role, content, flagged, escalated)
- `tasks` (cleaner tasks: property, window, status) → drives `property_status`: occupied / needs_cleaning / cleaning / ready / blocked
- `scheduled_messages` (type, send_at, sent_at)
- `events` (audit log)

## AI design (keep it simple)

- One property's knowledge base is a few KB of text — it fits directly in the system prompt. **No vector DB / embeddings needed for MVP.**
- Per-reservation context injected: dates, checkout time, guest name.
- Rules in system prompt: answer only from the property KB; if unknown or it involves money/refunds/ complaints/emergencies/maintenance → escalate to host with a summary; never invent facts; reply in the guest's language.
- Escalation triggers: explicit "talk to a human", sentiment/negative keywords, maintenance reports ("AC not working"), anything the KB doesn't cover.
- Model: any cheap, fast chat model (gpt-4o-mini class or equivalent). Cost: pennies per conversation.

## Tech stack

- **Next.js (App Router) + TypeScript** — one codebase: host dashboard, public guest chat, API routes.
- **Supabase** — Postgres + Auth (host/staff logins) + Row Level Security.
- **Drizzle ORM**, **Resend** (email), **Inngest or Upstash QStash** (scheduled jobs — more reliable than Vercel Cron).
- Deploy on **Vercel**.

## Deployment decision

**Vercel + Supabase — yes, for MVP through ~50 customers.**

| | Vercel + Supabase | VPS (Hetzner/DO) |
|---|---|---|
| Setup time | hours | days (Docker, nginx, SSL, backups, monitoring) |
| Monthly cost at MVP | $0–25 | $6–20 (but paid in your ops time) |
| Scaling | automatic | manual |
| Cron/background jobs | needs Inngest/QStash or Supabase pg_cron | trivial |
| Risk | vendor lock-in is low (standard Next.js + Postgres) | you own outages and security patches |

A solo founder's scarcest resource is building + selling, not saving $15/mo. Move the app to a VPS (keep Supabase) only when the Vercel bill hurts (~$100+/mo, i.e. after real revenue) or when long-running background workers dominate.

## Build order (≈6 weeks part-time)

1. **Week 1 — Foundation.** Repo, Next.js, Supabase schema, auth, property CRUD + knowledge-base editor.
2. **Week 2 — Reservations.** Manual CRUD + ICS import/parsing + hourly sync job; unique `chat_token` per reservation.
3. **Week 3 — Guest chat.** Public chat page (token, no login), AI answers from KB, escalation flagging, transcript stored.
4. **Week 4 — Host dashboard.** Today's check-ins/check-outs, conversations inbox, escalations queue, property status board.
5. **Week 5 — Automation.** Scheduled emails (welcome/check-in/checkout), checkout → cleaner task, cleaner link (no login) → mark cleaned → property "ready". Daily digest email to host.
6. **Week 6 — Polish + real user.** Onboarding flow, seed one real property manager you know, iterate on their feedback.

## Success metrics for the first 10 customers

- % of guest questions the AI resolves without the host (target 60%+)
- Link click rate on check-in email (target 40%+)
- Escalations handled < 15 min by host
- Time saved/week per customer (ask directly — this is your pricing justification and your testimonial)

## Go-to-market (first 10)

Direct outreach to 10–100-listing managers (LinkedIn, local STR companies, r/airbnbhosts, Facebook host groups). Offer free setup + 1 month free in exchange for a weekly feedback call. One well-serviced customer with visible time savings → referrals beat ads at this stage.
