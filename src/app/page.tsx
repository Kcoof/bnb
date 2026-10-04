import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabasePublicKey } from "@/lib/supabase/keys";
import { Icon } from "@/components/Icon";

const STEPS = [
  { n: "01", title: "Guest scans the QR", text: "Placed inside the property. No app, no login, no signup." },
  { n: "02", title: "Guest asks anything", text: "WiFi, parking, check-in, the washing machine, nearby restaurants." },
  { n: "03", title: "AI answers instantly", text: "24/7, in the guest's own language, using only your property's information." },
  { n: "04", title: "You stay undisturbed", text: "Money, complaints, maintenance? The host gets notified — only when needed." },
];

const FEATURES = [
  { icon: "bot", tint: "bg-accent-tint text-accent", title: "AI Concierge", text: "Every property gets its own assistant that answers repetitive questions instantly — and knows when to fetch you." },
  { icon: "sparkles", tint: "bg-accent-tint text-accent", title: "Guest Information", text: "WiFi, house rules, appliances, parking, recommendations, emergency info. The AI only answers from what you entered — it never invents." },
  { icon: "alert", tint: "bg-danger-tint text-danger", title: "Smart Escalation", text: "Late checkout, refunds, broken AC — after trying the built-in fix, it texts your phone with a one-line summary. Approve or decline from anywhere." },
  { icon: "qr", tint: "bg-success-tint text-success", title: "Print-and-Place QR", text: "A premium card for the nightstand or fridge. Guests scan and chat instantly — no app, no login, works forever." },
  { icon: "today", tint: "bg-warning-tint text-warning", title: "Calendar Sync", text: "Paste your Airbnb or Booking.com calendar link. Reservations sync every 2 hours — arrivals and departures on your dashboard." },
  { icon: "house", tint: "bg-surface-2 text-ink-2", title: "Multi-Property", text: "From one apartment to 100+. One dashboard, every property, every conversation." },
];

const PLANS = [
  { name: "Starter", price: "$29", per: "/month", props: "1–3 properties", features: ["AI guest chat", "Printable QR cards", "SMS escalation alerts"], featured: false },
  { name: "Professional", price: "$79", per: "/month", props: "Up to 10 properties", features: ["Everything in Starter", "Calendar sync", "Up to 10 properties"], featured: true },
  { name: "Business", price: "$199", per: "/month", props: "Up to 30 properties", features: ["Everything in Professional", "Priority support", "Up to 30 properties"], featured: false },
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
          Go to dashboard <Icon name="arrowRight" size={16} />
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas text-ink">
      {/* Nav — frosted sticky bar */}
      <nav className="sticky top-0 z-50 border-b border-hairline bg-[var(--nav-bg)] backdrop-blur-nav">
        <div className="mx-auto flex h-12 max-w-[1024px] items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-[6px] bg-ink text-[11px] font-semibold text-white">
              A
            </span>
            <span className="text-[15px] font-semibold tracking-[0.08em] text-ink">
              AUTOMI
            </span>
          </div>
          <div className="flex items-center gap-7">
            <a href="#how" className="hidden text-[12px] text-ink-2 transition duration-150 hover:text-ink sm:block">
              How it works
            </a>
            <a href="#features" className="hidden text-[12px] text-ink-2 transition duration-150 hover:text-ink sm:block">
              Features
            </a>
            <a href="#pricing" className="hidden text-[12px] text-ink-2 transition duration-150 hover:text-ink sm:block">
              Pricing
            </a>
            <Link href="/login" className="text-[12px] text-ink-2 transition duration-150 hover:text-ink">
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-[1024px] scroll-mt-16 px-6 pb-16 pt-20 text-center md:pb-24 md:pt-28">
        <div className="animate-fade-up">
          <p className="text-[17px] font-semibold text-accent">
            Airbnb manages the booking. AUTOMI manages the stay.
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl text-display">
            Your property&apos;s AI concierge.
            <span className="block text-ink-3">Available 24/7.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[19px] leading-relaxed text-ink-2">
            Instant answers for guests. Fewer interruptions for you.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/pricing" className="btn btn-primary btn-lg w-full sm:w-auto">
              Start Free Trial
            </Link>
            <a href="#how" className="btn btn-secondary btn-lg w-full sm:w-auto">
              See How It Works
            </a>
          </div>
        </div>

        {/* Chat demo */}
        <div className="mx-auto mt-14 max-w-sm rounded-xl bg-surface p-6 text-left shadow-float">
          <div className="mb-4 flex items-center gap-2.5 border-b border-hairline pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-tint text-accent">
              <Icon name="bot" size={18} />
            </div>
            <div>
              <div className="text-callout font-semibold">Automi Concierge</div>
              <div className="flex items-center gap-1.5 text-caption-1 text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                online 24/7
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="bubble-out" style={{ fontSize: 15, padding: "8px 14px" }}>
              What&apos;s the WiFi password?
            </div>
            <div className="bubble-in" style={{ fontSize: 15, padding: "8px 14px" }}>
              The WiFi network is <b>UrbanBasera_5G</b>, password <b>welcome2026</b>. Anything else?
            </div>
            <div className="bubble-out" style={{ fontSize: 15, padding: "8px 14px" }}>
              The AC isn&apos;t working
            </div>
            <div className="bubble-in" style={{ fontSize: 15, padding: "8px 14px" }}>
              I&apos;m sorry about that — I&apos;ve notified your host right away. The breaker is in the hallway cabinet if you want to check it.
            </div>
            <div className="bubble-note flex items-center gap-1.5" style={{ fontSize: 12 }}>
              <Icon name="alert" size={12} className="text-ink-2" />
              Host notified
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-16 border-y border-hairline bg-surface py-24 md:py-32">
        <div className="mx-auto max-w-[1024px] px-6">
          <h2 className="text-center text-headline">Scan → Chat → Get Help</h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-[17px] text-ink-2">
            Setup takes 5–10 minutes: answer a few questions about your property, print the QR, place it inside. Done.
          </p>
          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.n} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="text-[13px] font-semibold text-ink-3">{s.n}</div>
                <h3 className="mt-2 text-title-3">{s.title}</h3>
                <p className="mt-1.5 text-callout leading-relaxed text-ink-2">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-16 py-24 md:py-32">
        <div className="mx-auto max-w-[1024px] px-6">
          <h2 className="text-center text-headline">Everything after the booking</h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-[17px] text-ink-2">
            Not a booking platform. Not a PMS. The layer that makes guests happy and hosts free.
          </p>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="animate-fade-up rounded-lg border border-hairline bg-surface p-7 shadow-card transition duration-300 ease-out hover:-translate-y-1 hover:shadow-raised"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-[12px] ${f.tint}`}>
                  <Icon name={f.icon} size={20} />
                </div>
                <h3 className="mt-4 text-title-3">{f.title}</h3>
                <p className="mt-1.5 text-callout text-ink-2">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-16 border-t border-hairline bg-surface py-24 md:py-32">
        <div className="mx-auto max-w-[1024px] px-6">
          <h2 className="text-center text-headline">Simple pricing</h2>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={
                  p.featured
                    ? "rounded-[24px] border border-transparent bg-ink p-8 text-white shadow-float"
                    : "rounded-[24px] border border-hairline bg-surface p-8"
                }
              >
                <div className="flex items-center justify-between">
                  <span className={`text-callout font-medium ${p.featured ? "text-[#6db2ff]" : "text-accent"}`}>
                    {p.name}
                  </span>
                  {p.featured && (
                    <span className="rounded-full bg-accent px-2.5 py-1 text-caption-1 font-medium text-white">
                      Most popular
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-[40px] font-semibold tracking-[-0.02em]">{p.price}</span>
                  <span className={`text-footnote ${p.featured ? "text-white/60" : "text-ink-2"}`}>{p.per}</span>
                </div>
                <div className={`mt-1 text-footnote ${p.featured ? "text-white/60" : "text-ink-2"}`}>{p.props}</div>
                <ul className="mt-6 space-y-2.5 text-callout">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Icon
                        name="check"
                        size={14}
                        className={p.featured ? "text-[#6db2ff]" : "text-accent"}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={
                    p.featured
                      ? "btn btn-primary btn-md mt-8 w-full"
                      : "btn btn-secondary btn-md mt-8 w-full"
                  }
                >
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-caption-1 text-ink-3">
            Managing more than 30 properties? Talk to us about Business+.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-hairline py-10">
        <div className="mx-auto flex max-w-[1024px] flex-col items-center justify-between gap-4 px-6 text-[12px] text-ink-3 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-ink text-[10px] font-semibold text-white">
              A
            </span>
            AUTOMI — the AI operating system for short-term rentals.
          </div>
          <Link href="/login" className="text-ink-2 transition duration-150 hover:text-ink">
            Sign in
          </Link>
        </div>
      </footer>
    </main>
  );
}
