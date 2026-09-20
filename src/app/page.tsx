import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabasePublicKey } from "@/lib/supabase/keys";

const STEPS = [
  { n: "01", title: "Guest scans the QR", text: "Placed inside the property. No app, no login, no signup." },
  { n: "02", title: "Guest asks anything", text: "WiFi, parking, check-in, the washing machine, nearby restaurants." },
  { n: "03", title: "AI answers instantly", text: "24/7, in the guest's own language, using only your property's information." },
  { n: "04", title: "You stay undisturbed", text: "Money, complaints, maintenance? The host gets notified — only when needed." },
];

const FEATURES = [
  { icon: "💬", title: "AI Concierge", text: "Every property gets its own assistant that answers repetitive questions instantly — and knows when to fetch you." },
  { icon: "🧠", title: "Guest Information", text: "WiFi, house rules, appliances, parking, recommendations, emergency info. The AI only answers from what you entered — it never invents." },
  { icon: "🚨", title: "Smart Escalation", text: "Late checkout, refunds, broken AC — flagged to you with a one-line summary. Approve or decline in one tap." },
  { icon: "🧹", title: "Cleaning & Ops", text: "Checkout passed? The cleaner gets a link, marks the property cleaned, and it turns Ready — automatically." },
  { icon: "📅", title: "Calendar Sync", text: "Paste your Airbnb or Booking.com calendar link. Reservations sync every 2 hours — arrivals and departures on your dashboard." },
  { icon: "🏨", title: "Multi-Property", text: "From one apartment to 100+. One dashboard, every property, every conversation." },
];

const PLANS = [
  { name: "Starter", price: "$29", per: "/month", props: "1–3 properties", features: ["AI guest chat", "QR cards", "Escalations", "Email automation"] },
  { name: "Professional", price: "$79", per: "/month", props: "Up to 10 properties", features: ["Everything in Starter", "Calendar sync", "Cleaner workflows", "Team accounts"], featured: true },
  { name: "Business", price: "$199", per: "/month", props: "Up to 30 properties", features: ["Everything in Professional", "Priority support", "Custom templates", "Onboarding help"] },
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
      <main className="flex min-h-screen items-center justify-center bg-[#faf7f2]">
        <Link href="/dashboard" className="rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-white">
          Go to dashboard →
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf7f2] text-stone-800">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-sm font-bold text-amber-200">A</span>
          <span className="text-lg font-semibold tracking-tight text-stone-900">AUTOMI</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <a href="#how" className="hidden text-stone-600 hover:text-stone-900 sm:block">How it works</a>
          <a href="#features" className="hidden text-stone-600 hover:text-stone-900 sm:block">Features</a>
          <a href="#pricing" className="hidden text-stone-600 hover:text-stone-900 sm:block">Pricing</a>
          <Link href="/login" className="rounded-full border border-stone-300 bg-white px-4 py-2 font-medium text-stone-800 hover:border-stone-400">
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-14 text-center sm:pt-20">
        <p className="mx-auto mb-6 inline-block rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-medium tracking-wide text-amber-800">
          AIRBNB MANAGES YOUR BOOKINGS. AUTOMI MANAGES YOUR GUESTS.
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-6xl">
          Your property&apos;s AI concierge.
          <span className="block text-stone-400">Available 24/7.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-stone-600">
          Guests get instant answers. Hosts get fewer interruptions.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/login" className="w-full rounded-full bg-stone-900 px-8 py-4 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-700 sm:w-auto">
            Start Free Trial
          </Link>
          <a href="#how" className="w-full rounded-full border border-stone-300 bg-white px-8 py-4 text-sm font-semibold text-stone-800 transition hover:border-stone-400 sm:w-auto">
            See How It Works
          </a>
        </div>

        {/* Chat demo */}
        <div className="mx-auto mt-16 max-w-sm rounded-3xl border border-stone-200 bg-white p-5 text-left shadow-sm">
          <div className="mb-4 flex items-center gap-2 border-b border-stone-100 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm">🤖</div>
            <div>
              <div className="text-sm font-semibold text-stone-900">Automi Concierge</div>
              <div className="text-[10px] uppercase tracking-wide text-emerald-600">online 24/7</div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-stone-900 px-3.5 py-2 text-white">What&apos;s the WiFi password?</div>
            <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-stone-100 px-3.5 py-2 text-stone-800">
              The WiFi network is <b>UrbanBasera_5G</b>, password <b>welcome2026</b>. Anything else?
            </div>
            <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-stone-900 px-3.5 py-2 text-white">The AC isn&apos;t working 😕</div>
            <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-amber-50 px-3.5 py-2 text-amber-900">
              I&apos;m sorry about that — I&apos;ve notified your host right away. They&apos;ll follow up shortly. The breaker is in the hallway cabinet if you want to check it.
            </div>
            <div className="text-center text-[10px] text-stone-400">⚠ host notified instantly</div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-stone-200 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-stone-900">
            Scan → Chat → Get Help
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-stone-600">
            Setup takes 5–10 minutes: answer a few questions about your property, print the QR, place it inside. Done.
          </p>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="relative">
                <div className="text-xs font-semibold tracking-widest text-amber-700">{s.n}</div>
                <h3 className="mt-2 font-semibold text-stone-900">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-stone-900">
            Everything after the booking
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-stone-600">
            Not a booking platform. Not a PMS. The layer that makes guests happy and hosts free.
          </p>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <div className="text-2xl">{f.icon}</div>
                <h3 className="mt-3 font-semibold text-stone-900">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-stone-200 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-stone-900">Simple pricing</h2>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl border p-8 ${p.featured ? "border-stone-900 bg-stone-900 text-white shadow-lg" : "border-stone-200 bg-[#faf7f2] text-stone-800"}`}
              >
                <div className={`text-sm font-medium ${p.featured ? "text-amber-200" : "text-amber-700"}`}>{p.name}</div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold">{p.price}</span>
                  <span className={`text-sm ${p.featured ? "text-stone-300" : "text-stone-500"}`}>{p.per}</span>
                </div>
                <div className={`mt-1 text-sm ${p.featured ? "text-stone-300" : "text-stone-500"}`}>{p.props}</div>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className={p.featured ? "text-amber-200" : "text-amber-700"}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`mt-8 block rounded-full px-5 py-3 text-center text-sm font-semibold transition ${p.featured ? "bg-amber-200 text-stone-900 hover:bg-amber-100" : "border border-stone-300 bg-white text-stone-800 hover:border-stone-400"}`}
                >
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-stone-400">
            Managing more than 30 properties? Talk to us about Business+.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-stone-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-stone-900 text-[10px] font-bold text-amber-200">A</span>
            AUTOMI — the AI operating system for short-term rentals.
          </div>
          <Link href="/login" className="hover:text-stone-800">Sign in</Link>
        </div>
      </footer>
    </main>
  );
}
