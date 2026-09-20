import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/auth";
import { chatUrl } from "@/lib/mail";

// QR + link for the property-level concierge card (host-authenticated).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const member = await requireOrgMember();
  if (!member) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const prop = (
    await db
      .select({ conciergeToken: properties.conciergeToken, name: properties.name })
      .from(properties)
      .where(and(eq(properties.id, id), eq(properties.orgId, member.profile.orgId)))
      .limit(1)
  )[0];
  if (!prop?.conciergeToken) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  const url = chatUrl(prop.conciergeToken);
  const qr = await QRCode.toDataURL(url, { width: 600, margin: 1 });
  return Response.json({ url, qr, name: prop.name });
}
