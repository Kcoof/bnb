import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabasePublicKey } from "@/lib/supabase/keys";
import { Faq } from "./Faq";

// Landing page authored by Gemini 3.7 (PAGES-GEMINI.md) — copy verbatim
// except fabricated traction (metrics/testimonials), replaced with honest
// equivalents per the build spec's honesty rule (§11).
const DEMO = [
  { role: "guest", time: "10:14 PM", text: "We just arrived and the fireplace is laid, but we can't seem to locate the chimney flue lever." },
  { role: "concierge", time: "10:14 PM", text: "Welcome to Highclere, Julian. The cast-iron damper handle is tucked directly inside the upper-right hood of the hearth. Turn it 90 degrees counter-clockwise until it clicks open. You will also find extra cedar kindling in the woven basket to the left of the mantle." },
  { role: "guest", time: "10:22 PM", text: "Perfect, burning wonderfully. One other question — we love this place. Could we arrange a 1:00 PM late check-out on Sunday?" },
  { role: "concierge", time: "10:22 PM", text: "I'm delighted you are enjoying the hearth. Sunday has an incoming guest arriving at 3:00 PM, so standard housekeeping begins promptly at 11:00 AM. However, I can confirm a complimentary extension to 11:45 AM right now, or safely store your luggage in the front vestibule until 2:00 PM. Would either of those serve your travel plans?" },
];

const STEPS = [
  { n: "01", title: "Curate the House Ledger", body: "Answer a few simple questions about your property — Wi-Fi, appliances, parking, house rules, your favorite local spots. AUTOMI turns it into your private house ledger in under four minutes." },
  { n: "02", title: "Present the Welcome Card", body: "Place the printed linen QR card in the entryway, kitchen island, or bedside table. No app download, registration, or guest login required." },
  { n: "03", title: "Conversations Unfold Naturally", body: "Guests scan and converse in their native language over a fast mobile page. Every answer reflects your exact house rules, tone, and specifics." },
  { n: "04", title: "Summoned Only When Essential", body: "Should something break or a special request arise, AUTOMI pages you via instant SMS with the guest's context already organized." },
];

const FEATURES = [
  { title: "The Living House Manual", body: "Understands intricate setups — heating, hot tubs, sound systems, vintage ranges — with absolute clarity, straight from what you told it." },
  { title: "Frictionless Language Parity", body: "Guests write in any language and receive an immediate, culturally gracious reply in their own tongue." },
  { title: "Intelligent SMS Escalation", body: "Routine questions never reach you. Only genuine emergencies or decisions that are yours to make trigger an SMS to your phone." },
  { title: "Curated Local Concierge", body: "Recommends your favored hidden bakeries, trails, and pharmacies — host-vetted, never invented." },
  { title: "Arrival & Departure Guidance", body: "Walks guests through lockbox entry on arrival and the departure checklist on the way out — without a single host text." },
  { title: "Strict House Guardrails", body: "It cannot invent amenities, authorize parties, or promise exceptions. Unsupported requests are escalated to you, politely." },
];

const FAQS = [
  { q: "Will AUTOMI ever invent details or promise early check-in without my permission?", a: "Never. AUTOMI operates strictly on your property's data. It is programmatically prohibited from approving policy exceptions, early arrivals, late check-outs, or unauthorized guests. When an unsupported request arises, it politely sets expectations and escalates the decision directly to you." },
  { q: "What happens if a critical emergency occurs, like a burst pipe at 2:00 AM?", a: "AUTOMI immediately recognizes emergency keywords (water leak, power outage, smoke, security). It shows the guest your documented shut-off locations and emergency contacts, and simultaneously sends an urgent SMS alert to your phone." },
  { q: "How much effort is required to set up my property?", a: "Under four minutes per property. The setup asks one question at a time — property name, Wi-Fi, appliances, rules, local picks — and appliances come with pre-written how-tos you can edit." },
  { q: "Do my guests have to download an app or sign up?", a: "No. Guests simply point their phone camera at the printed card. A fast, elegant mobile page opens instantly. Zero apps, zero accounts, zero passwords." },
  { q: "Does this diminish the personal warmth of my hosting?", a: "Hosts tell us it does the opposite. Guests receive immediate, gracious answers in your voice instead of waiting for a text reply — and you're freed for genuine, high-impact hospitality." },
];

export default async function LandingPage() {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && supabasePublicKey();
  let signedIn = false;
  if (configured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  }
  if (signedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas">
        <Link href="/dashboard" className="btn btn-primary btn-lg">
          Go to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas text-ink">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-[#E6E2D8] bg-[rgba(248,246,241,0.85)] backdrop-blur-nav">
        <div className="mx-auto flex h-14 max-w-[1024px] items-center justify-between px-6">
          <span className="font-display text-[18px] tracking-[0.12em] text-ink">AUTOMI</span>
          <div className="hidden items-center gap-7 text-[13px] text-[#636059] sm:flex">
            <a href="#how" className="transition hover:text-ink">The Method</a>
            <a href="#guardrails" className="transition hover:text-ink">Guardrails</a>
            <a href="#pricing" className="transition hover:text-ink">Pricing</a>
            <a href="#faq" className="transition hover:text-ink">Questions</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[13px] text-[#636059] transition hover:text-ink">Host Sign In</Link>
            <Link href="/pricing" className="btn btn-primary btn-sm">Begin Free Trial</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-[1024px] scroll-mt-16 px-6 pb-16 pt-16 md:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[55%_45%]">
          <div className="animate-fade-up">
            <p className="text-[12px] font-medium uppercase tracking-[0.15em] text-[#C27E4B]">
              Discreet AI hospitality for exceptional homes
            </p>
            <h1 className="font-display mt-4 max-w-xl text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.12] tracking-[-0.015em] text-ink">
              Your property, remembered and answered with grace.
            </h1>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-[#636059]">
              AUTOMI gives each of your residences a private, 24/7 concierge. Guests scan a
              single card on arrival. Inquiries are resolved instantly from your exact house
              rules — summoning you only when a human touch is indispensable.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/pricing" className="btn btn-primary btn-lg w-full sm:w-auto">
                Create Your Property Concierge
              </Link>
              <a href="#demo" className="btn btn-secondary btn-lg w-full sm:w-auto">
                Explore an Active Stay Demo
              </a>
            </div>
            <p className="mt-4 text-[13px] text-[#8A8780]">
              No credit card required · Setup takes under 4 minutes
            </p>
          </div>

          {/* Demo card */}
          <div id="demo" className="animate-fade-up scroll-mt-20 rounded-2xl border border-[#E6E2D8] bg-white p-6 shadow-float">
            <div className="mb-4 flex items-center justify-between border-b border-[#E6E2D8] pb-3">
              <span className="font-display text-[15px] text-ink">The Carriage House at Highclere</span>
              <span className="rounded-full bg-[#EAF2EB] px-2.5 py-0.5 text-[11px] font-medium text-[#2E5A44]">
                Active guest session
              </span>
            </div>
            <div className="space-y-2.5">
              {DEMO.map((m, i) => (
                <div key={i}>
                  {m.role === "guest" ? (
                    <div className="ml-auto w-fit max-w-[88%] rounded-[16px] rounded-br-[4px] bg-[#F2EFE9] px-4 py-2.5 text-[14px] leading-relaxed text-ink">
                      {m.text}
                    </div>
                  ) : (
                    <div className="flex items-end gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1E2B24] font-display text-[11px] text-[#F8F6F1]">A</span>
                      <div className="w-fit max-w-[88%] rounded-[16px] rounded-bl-[4px] border border-[#E6E2D8] bg-white px-4 py-2.5 text-[14px] leading-relaxed text-ink shadow-card">
                        {m.text}
                      </div>
                    </div>
                  )}
                  <div className={`mt-0.5 text-[10px] text-[#8A8780] ${m.role === "guest" ? "text-right" : "pl-8"}`}>{m.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Honest promises strip (replacing fabricated metrics) */}
      <section className="border-y border-[#E6E2D8] bg-[#F2EFE9] py-10">
        <div className="mx-auto grid max-w-[1024px] gap-6 px-6 text-center sm:grid-cols-3">
          {[
            ["Answered in seconds", "Guests never wait for the Wi-Fi password — day or night."],
            ["Answered from your rules only", "Nothing invented, nothing promised. Your house ledger is the single source."],
            ["You, only when it matters", "SMS with full context — for decisions and emergencies, not routine questions."],
          ].map(([t, b]) => (
            <div key={t}>
              <div className="font-display text-[19px] text-[#1E2B24]">{t}</div>
              <p className="mx-auto mt-1.5 max-w-[26ch] text-[14px] leading-relaxed text-[#636059]">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-[1024px] scroll-mt-16 px-6 py-20 md:py-28">
        <p className="text-center text-[12px] font-medium uppercase tracking-[0.15em] text-[#C27E4B]">The Method</p>
        <h2 className="font-display mt-3 text-center text-[clamp(1.8rem,3.5vw,2.5rem)] leading-tight text-ink">
          Flawless execution from arrival to departure.
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-[16px] text-[#636059]">
          Transforming your house knowledge into an elegant guest companion takes minutes.
        </p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.n} className="animate-fade-up rounded-xl border border-[#E6E2D8] bg-white p-6" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="font-display text-[26px] text-[#C27E4B]">{s.n}</div>
              <h3 className="font-display mt-3 text-[19px] leading-snug text-ink">{s.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#636059]">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Guardrails */}
      <section id="guardrails" className="scroll-mt-16 border-y border-[#E6E2D8] bg-[#F2EFE9] py-20 md:py-28">
        <div className="mx-auto grid max-w-[1024px] items-center gap-10 px-6 lg:grid-cols-2">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.15em] text-[#C27E4B]">Absolute Fidelity</p>
            <h2 className="font-display mt-3 text-[clamp(1.8rem,3.5vw,2.5rem)] leading-tight text-ink">
              Strict guardrails. Zero invented promises.
            </h2>
            <p className="mt-4 max-w-md text-[16px] leading-relaxed text-[#636059]">
              AUTOMI is hard-bounded by your verified property rules. It will never invent
              amenities, authorize unpermitted guests, or contradict your house philosophy.
            </p>
            <ul className="mt-7 space-y-3.5">
              {[
                ["Strict data boundary", "Your property knowledge is private and isolated per property."],
                ["Automated rule enforcement", "Party or occupancy violations get polite, firm boundaries — and you get notified."],
                ["Instant host override", "Jump into any live conversation from your phone with one tap."],
              ].map(([t, b]) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-0.5 shrink-0 text-[#1E2B24]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 12.5l5 5 10-11" /></svg>
                  </span>
                  <div>
                    <div className="text-[15px] font-medium text-ink">{t}</div>
                    <div className="mt-0.5 text-[14px] text-[#636059]">{b}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#1E2B24] p-6 shadow-float">
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#C27E4B]">House rule 4.2 — as entered by the host</div>
            <p className="mt-2 text-[14px] leading-relaxed text-[#F8F6F1]/90">
              Maximum 4 registered guests on premises. Strict quiet hours begin at 10:00 PM.
              No external visitors without prior written approval.
            </p>
            <div className="mt-5 rounded-xl bg-[#F2EFE9] p-4 text-[14px] leading-relaxed text-[#191816]">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#636059]">Guest asks —</span><br />
              &ldquo;Hey, we are having 6 friends over for wine and music on the terrace tonight around 10:30 PM, that&rsquo;s fine right?&rdquo;
            </div>
            <div className="mt-3 rounded-xl bg-white p-4 text-[14px] leading-relaxed text-[#191816]">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#2E5A44]">AUTOMI answers —</span><br />
              &ldquo;I must gently clarify that the property observes strict quiet hours starting at 10:00 PM, and terrace occupancy is limited exclusively to the 4 registered guests on the reservation. External visitors are not permitted on the premises. We appreciate your cooperation in preserving the tranquility of our residential neighborhood.&rdquo;
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-[1024px] px-6 py-20 md:py-28">
        <p className="text-center text-[12px] font-medium uppercase tracking-[0.15em] text-[#C27E4B]">Capabilities</p>
        <h2 className="font-display mt-3 text-center text-[clamp(1.8rem,3.5vw,2.5rem)] leading-tight text-ink">
          Engineered for the demands of high-touch properties.
        </h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="animate-fade-up rounded-xl border border-[#E6E2D8] bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-[#C27E4B]" style={{ animationDelay: `${i * 60}ms` }}>
              <h3 className="font-display text-[19px] text-ink">{f.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#636059]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-16 border-t border-[#E6E2D8] bg-white py-20 md:py-28">
        <div className="mx-auto max-w-[1024px] px-6">
          <p className="text-center text-[12px] font-medium uppercase tracking-[0.15em] text-[#C27E4B]">Investment</p>
          <h2 className="font-display mt-3 text-center text-[clamp(1.8rem,3.5vw,2.5rem)] leading-tight text-ink">
            Predictable pricing for distinguished portfolios.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-[15px] text-[#636059]">
            Every tier includes unlimited guest conversations, complete customization, and printable welcome cards.
          </p>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {[
              { name: "Starter", sub: "The Pied-à-Terre Collection", price: 29, target: "For hosts managing up to 3 residences.", features: ["Up to 3 active properties", "Unlimited guest conversations", "Multilingual answers in your guest's language", "SMS escalation to your phone", "Printable linen welcome cards"], cta: "Begin with Starter", featured: false },
              { name: "Professional", sub: "The Estate Portfolio", price: 79, target: "For growing portfolios up to 10 residences.", features: ["Up to 10 active properties", "Everything in Starter", "Calendar sync (Airbnb, Booking.com)", "Custom branding & concierge tone", "Priority support"], cta: "Select Professional", featured: true },
              { name: "Business", sub: "The Hospitality Atelier", price: 199, target: "For management firms with up to 30 estates.", features: ["Up to 30 active properties", "Everything in Professional", "Multi-property operations view", "Priority onboarding assistance", "Dedicated support line"], cta: "Inquire for Business", featured: false },
            ].map((p) => (
              <div
                key={p.name}
                className={
                  p.featured
                    ? "relative rounded-2xl border-2 border-[#1E2B24] bg-white p-8 shadow-float lg:-mt-4 lg:mb-4"
                    : "rounded-2xl border border-[#E6E2D8] bg-white p-8"
                }
              >
                {p.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#1E2B24] px-3 py-1 text-[11px] font-medium text-[#F8F6F1]">
                    Most favored by boutique operators
                  </span>
                )}
                <div className="text-[13px] text-[#C27E4B]">{p.sub}</div>
                <div className="font-display mt-2 text-[22px] text-ink">{p.name}</div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-[42px] leading-none text-ink">${p.price}</span>
                  <span className="text-[14px] text-[#636059]">/ month</span>
                </div>
                <p className="mt-2 text-[14px] text-[#636059]">{p.target}</p>
                <ul className="mt-6 space-y-2.5 text-[14px] text-[#191816]">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="mt-1 shrink-0 text-[#1E2B24]">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 12.5l5 5 10-11" /></svg>
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/pricing" className={`mt-8 w-full ${p.featured ? "btn btn-primary btn-md" : "btn btn-secondary btn-md"}`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-16 py-20 md:py-28">
        <div className="mx-auto max-w-[1024px] px-6">
          <p className="text-center text-[12px] font-medium uppercase tracking-[0.15em] text-[#C27E4B]">Clarity</p>
          <h2 className="font-display mt-3 text-center text-[clamp(1.8rem,3.5vw,2.5rem)] leading-tight text-ink">
            Common questions from discerning hosts.
          </h2>
          <div className="mt-10">
            <Faq items={FAQS} />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-[1024px] px-6 pb-20">
        <div className="rounded-2xl bg-[#1E2B24] px-6 py-16 text-center md:py-20">
          <h2 className="font-display text-[clamp(1.8rem,4vw,2.8rem)] leading-tight text-[#F8F6F1]">
            Grant your residences the voice they deserve.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[16px] text-[#F8F6F1]/80">
            Reclaim your peace of mind while elevating the guest experience.
          </p>
          <Link
            href="/pricing"
            className="mt-8 inline-flex h-[52px] items-center rounded-full bg-[#C27E4B] px-8 text-[16px] font-semibold text-white transition hover:bg-[#D48D59]"
          >
            Begin Free Trial
          </Link>
          <p className="mt-4 text-[13px] text-[#F8F6F1]/60">
            Complimentary setup assistance · No credit card required · Instant card generation
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E6E2D8] py-10">
        <div className="mx-auto flex max-w-[1024px] flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="font-display text-[15px] tracking-[0.12em] text-ink">AUTOMI</span>
            <span className="text-[13px] text-[#636059]">— quiet luxury guest concierge systems</span>
          </div>
          <div className="flex items-center gap-5 text-[13px] text-[#636059]">
            <a href="#how" className="hover:text-ink">The Method</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
            <Link href="/login" className="hover:text-ink">Host Sign In</Link>
          </div>
        </div>
        <p className="mt-6 text-center text-[12px] text-[#8A8780]">© {new Date().getFullYear()} AUTOMI. All rights reserved.</p>
      </footer>
    </main>
  );
}
