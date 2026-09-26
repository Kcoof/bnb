import Link from "next/link";
import { Icon } from "@/components/Icon";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-[16px] bg-surface-2 text-ink-2">
          <Icon name="lock" size={24} />
        </div>
        <h1 className="mt-4 text-title-2 text-ink">
          This link is no longer active
        </h1>
        <p className="mt-2 text-callout text-ink-2">
          The link may have expired, been replaced, or the reservation was
          cancelled. If you need help with your stay, please contact your host
          directly through your booking app.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block text-callout text-accent hover:underline"
        >
          AUTOMI
        </Link>
      </div>
    </main>
  );
}
