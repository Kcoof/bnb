import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadGuestChatContext } from "@/lib/tokens";
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
  const ctx = await loadGuestChatContext(token);
  if (!ctx) notFound();
  if (!ctx.chatEnabled) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <div className="max-w-sm text-center">
          <h1 className="text-title-2">Concierge is briefly unavailable</h1>
          <p className="mt-2 text-callout text-ink-2">
            The host has been notified. If you need urgent help, please contact
            them through your booking app.
          </p>
        </div>
      </main>
    );
  }
  
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
