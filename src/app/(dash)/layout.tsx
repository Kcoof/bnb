import { redirect } from "next/navigation";
import { requireOrgMember } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";
import { Icon } from "@/components/Icon";
import { SideNav, NavBrand } from "./SideNav";
import { TabBar } from "./TabBar";

export default async function DashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await requireOrgMember();
  if (!member) redirect("/login");

  return (
    <div className="min-h-screen">
      {/* Desktop: iCloud-style frosted sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-hairline bg-[var(--sidebar-bg)] backdrop-blur-nav px-3 py-5 md:flex">
        <NavBrand />
        <SideNav />
        <form action={signOutAction} className="px-0 pt-2">
          <button
            type="submit"
            className="flex h-10 w-full items-center gap-2.5 rounded-sm px-3 text-callout font-medium text-ink-2 transition duration-150 hover:bg-black/[0.04] hover:text-ink"
          >
            <Icon name="person" size={18} />
            <span className="truncate">
              Sign out ({member.profile.fullName || member.email})
            </span>
          </button>
        </form>
      </aside>

      {/* Content */}
      <div className="md:pl-[264px]">
        <div className="mx-auto max-w-[1024px] px-5 pb-24 pt-8 md:px-8 md:pb-12 md:pt-12">
          {children}
        </div>
      </div>

      {/* Mobile: iOS bottom tab bar */}
      <TabBar />
    </div>
  );
}
