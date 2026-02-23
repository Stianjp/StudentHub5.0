"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Building2, Calendar, LayoutDashboard, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/navigation/logout-button";
import { SessionGuard } from "@/components/supabase/session-guard";

type NavItem = {
  href: string;
  label: string;
  icon: "dashboard" | "profile" | "events" | "companies" | "settings";
};

type StudentShellProps = {
  nav: NavItem[];
  userName: string;
  userInitials: string;
  children: ReactNode;
};

export function StudentShell({ nav, userName, userInitials, children }: StudentShellProps) {
  const pathname = usePathname() ?? "";
  const displayName = userName.split(" ")[0] || userName;
  const iconMap = {
    dashboard: LayoutDashboard,
    profile: User,
    events: Calendar,
    companies: Building2,
    settings: Settings,
  };
  const activeHref = nav
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="student-scope min-h-screen bg-[#846AE6] text-[#EDE8F5] font-['Ubuntu']">
      <a
        href="#student-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[#FE9A70] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#140249]"
      >
        Hopp til innhold
      </a>
      <SessionGuard />
      <div className="flex min-h-screen">
        <aside className="w-72 shrink-0 border-r border-white/10 bg-[#140249] p-8 text-[#EDE8F5] shadow-2xl shadow-black/30">
          <div className="flex items-center space-x-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B0130] shadow-lg shadow-black/30">
              <span className="text-lg font-black text-[#FE9A70]">OSH</span>
            </div>
            <div>
              <h1 className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#EDE8F5]/55">
                Oslo Student Hub
              </h1>
              <p className="text-xl font-black text-[#EDE8F5]">Portal</p>
            </div>
          </div>

          <nav className="mt-12">
            <p className="mb-6 px-4 text-[11px] font-black uppercase tracking-widest text-[#EDE8F5]/55">
              Navigasjon
            </p>
            {nav.map((item) => {
              const Icon = iconMap[item.icon];
              const isActive = activeHref === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "mb-2 flex w-full items-center space-x-3 rounded-2xl border border-transparent p-4 text-sm font-bold transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE9A70] focus-visible:ring-offset-2 focus-visible:ring-offset-[#140249]",
                    isActive
                      ? "border-[#FE9A70] bg-[#FE9A70] text-[#140249] shadow-[0_10px_24px_rgba(254,154,112,0.35)]"
                      : "text-[#EDE8F5] hover:border-[#FE9A70]/70 hover:bg-[#1E0B62] hover:text-white",
                  )}
                >
                  <Icon size={20} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-10 border-t border-white/10 pt-6">
            <LogoutButton
              role="student"
              className="flex w-full items-center space-x-3 text-sm font-bold text-[#EDE8F5]/70 transition-colors hover:text-[#FE9A70]"
            >
              <span>Logg ut</span>
            </LogoutButton>
          </div>
        </aside>

        <main id="student-main" className="relative flex-1 overflow-y-auto bg-[#846AE6] p-6 md:p-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative z-10">
            <div className="mb-10 flex justify-end">
              <div className="flex items-center space-x-4 rounded-2xl bg-[#140249] px-4 py-2 text-white shadow-xl ring-1 ring-white/15">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FE9A70] text-sm font-black text-[#140249]">
                  {userInitials || "SH"}
                </div>
                <span className="text-sm font-bold">{displayName}</span>
              </div>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
