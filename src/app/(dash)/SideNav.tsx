"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";

// AUTOMI v2 nav (spec §3): three destinations only. Inbox/board/tasks/
// reservations remain as deep-linkable routes but are not surfaced.
const NAV = [
  { href: "/dashboard", label: "Today", icon: "today" },
  { href: "/properties", label: "Properties", icon: "house" },
  { href: "/settings", label: "Settings", icon: "gear" },
];

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1">
      {NAV.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex h-10 items-center gap-2.5 rounded-sm px-3 text-callout font-medium transition duration-150 ${
              active
                ? "bg-surface text-ink shadow-card"
                : "text-ink-2 hover:bg-black/[0.04] hover:text-ink"
            }`}
          >
            <Icon name={item.icon} size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function NavBrand() {
  return (
    <div className="flex items-center gap-2 px-3 pb-4">
      <span className="flex h-5 w-5 items-center justify-center rounded-[6px] bg-ink text-[11px] font-semibold text-white">
        A
      </span>
      <span className="text-[15px] font-semibold tracking-[0.08em] text-ink">
        AUTOMI
      </span>
    </div>
  );
}

