import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="mt-3 text-lg font-semibold text-slate-900">
          This link is no longer active
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          The link may have expired, been replaced, or the reservation was
          cancelled. If you need help with your stay, please contact your host
          directly through your booking app.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm text-slate-400 hover:text-slate-600">
          bnb-ops
        </Link>
      </div>
    </main>
  );
}
