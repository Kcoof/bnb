import Link from "next/link";
import { and, eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { conciergeQrUrl } from "@/lib/mail";
import { PrintButton } from "./PrintButton";

export default async function PropertyCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const member = await requireOrgMember();
  if (!member) return null;
  const { id } = await params;

  const prop = (
    await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, id), eq(properties.orgId, member.profile.orgId)))
      .limit(1)
  )[0];
  if (!prop?.conciergeToken) {
    return <p className="text-sm text-ink-2">Property not found or no concierge QR.</p>;
  }

  const url = conciergeQrUrl(prop.conciergeToken);
  const qr = await QRCode.toDataURL(url, { width: 600, margin: 1 });

  return (
    <div className="mx-auto max-w-xl">
      <div className="no-print flex items-center justify-between">
        <Link href={`/properties/${prop.id}`} className="text-callout text-accent hover:underline">
          ← {prop.name}
        </Link>
        <PrintButton />
      </div>

      {/* The printable card (Automi premium style) */}
      <div
        id="card"
        className="mx-auto mt-6 w-[380px] rounded-xl border border-[#e3dccd] bg-[#faf7f2] p-10 text-center shadow-card"
      >
        <div className="flex items-center justify-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1d1d1f] text-xs font-bold text-white">
            A
          </span>
          <span className="text-[13px] font-semibold tracking-[0.22em] text-[#1d1d1f]">AUTOMI</span>
        </div>

        <div className="mt-6 text-[11px] font-medium uppercase tracking-[0.25em] text-[#6e6e73]">
          Your stay assistant
        </div>
        <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">Need anything?</h1>
        <p className="mt-1.5 text-[15px] leading-snug text-[#6e6e73]">
          Scan to chat with your
          <br />
          24/7 concierge
        </p>

        <div className="mx-auto mt-6 w-fit rounded-[16px] border border-[#d2d2d7] bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Scan to chat" width={210} height={210} />
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-[11px] uppercase tracking-[0.12em] text-[#6e6e73]">
          <span>WiFi</span>·<span>Check-in</span>·<span>Checkout</span>·<span>Amenities</span>·
          <span>Recommendations</span>·<span>Help</span>
        </div>

        <div className="mt-6 border-t border-[#e3dccd] pt-4 text-[13px] text-[#1d1d1f]">
          {prop.name}
        </div>
      </div>

      <p className="no-print mx-auto mt-4 max-w-sm text-center text-xs text-ink-3">
        Print on card stock, trim to the border, and place it on the fridge, nightstand, or
        welcome folder. The QR never expires and works for every guest.
      </p>
    </div>
  );
}
