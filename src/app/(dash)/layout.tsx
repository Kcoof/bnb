import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrgMember } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";

const NAV = [
  { href: "/dashboard", label: "Today" },
  { href: "/inbox", label: "Inbox" },
  { href: "/board", label: "Status board" },
  { href: "/tasks", label: "Cleaning tasks" },
  { href: "/reservations", label: "Reservations" },
  { href: "/properties", label: "Properties" },
  { href: "/settings", label: "Settings" },
];

export default async function DashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await requireOrgMember();
  if (!member) redirect("/login");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 md:flex">
        <div className="px-2 text-sm font-semibold text-slate-900">
          🏠 bnb-ops
        </div>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={signOutAction}>
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            Sign out ({member.profile.fullName || member.email})
          </button>
        </form>
      </aside>
      <main className="flex-1 overflow-x-hidden px-6 py-8 md:px-10">{children}</main>
    </div>
  );
}
