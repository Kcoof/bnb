"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { signOutAction } from "@/app/actions/auth";

// Mobile tab bar (spec §3): the three sections + More (settings lives in tabs
// already, so More = sign out only).
const TABS = [
  { href: "/dashboard", label: "Today", icon: "today" },
  { href: "/properties", label: "Properties", icon: "house" },
];

export function TabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {moreOpen && (
        <div
          className="fixed inset-0 z-50 bg-[var(--overlay)]"
          onClick={() => setMoreOpen(false)}
          aria-hidden="true"
        />
      )}
      {moreOpen && (
        <div
          role="dialog"
          aria-label="More"
          className="fixed inset-x-3 bottom-3 z-50 rounded-xl bg-surface p-2 pb-[max(env(safe-area-inset-bottom),8px)] shadow-float animate-sheet-up"
        >
          <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-black/15" />
          <Link
            href="/settings"
            onClick={() => setMoreOpen(false)}
            className="flex h-12 items-center gap-2.5 rounded-[10px] px-3 text-callout text-ink transition duration-100 hover:bg-black/[0.04]"
          >
            <Icon name="gear" size={18} />
            Settings
          </Link>
          <form action={signOutAction} className="mt-1 border-t border-hairline pt-1">
            <button
              type="submit"
              className="flex h-12 w-full items-center gap-2.5 rounded-[10px] px-3 text-callout font-semibold text-accent transition duration-100 hover:bg-black/[0.04]"
            >
              <Icon name="person" size={18} />
              Sign out
            </button>
          </form>
          <button
            onClick={() => setMoreOpen(false)}
            className="flex h-12 w-full items-center justify-center rounded-[10px] text-callout font-semibold text-accent"
          >
            Cancel
          </button>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-[var(--nav-bg)] backdrop-blur-nav pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid grid-cols-3">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center gap-0.5 py-2 ${isActive(t.href) ? "text-accent" : "text-ink-2"}`}
            >
              <Icon name={t.icon} size={24} />
              <span className="text-[10px] font-medium">{t.label}</span>
            </Link>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-0.5 py-2 ${isActive("/settings") ? "text-accent" : "text-ink-2"}`}
          >
            <Icon name="gear" size={24} />
            <span className="text-[10px] font-medium">Settings</span>
          </button>
        </div>
      </nav>
    </>
  );
}
