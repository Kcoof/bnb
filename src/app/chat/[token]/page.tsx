import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { validateGuestToken } from "@/lib/tokens";
import { ChatWidget } from "./ChatWidget";

export const metadata: Metadata = {
  title: "Your stay assistant",
  robots: { index: false, follow: false },
};

export default async function GuestChatPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ctx = await validateGuestToken(token);
  if (!ctx) notFound();

  const { reservation, property } = ctx;
  const guestFirst = (reservation.guestName ?? "").split(" ")[0];

  return (
    <ChatWidget
      token={token}
      assistantName={property.assistantName}
      propertyName={property.name}
      guestFirst={guestFirst || "there"}
    />
  );
}
