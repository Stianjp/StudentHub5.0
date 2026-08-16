"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Building2, Calendar, LayoutDashboard, LogOut, Settings, User } from "lucide-react";
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
    <div className="student-scope min-h-screen overflow-x-clip bg-[#846AE6] text-[#EDE8F5] font-['Ubuntu']">
      <a
        href="#student-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[#FE9A70] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#140249]"
      >
        Hopp til innhold
      </a>
      <SessionGuard />
      <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between border-b border-white/10 bg-[#140249]/95 px-4 py-2.5 text-white shadow-lg backdrop-blur lg:hidden">
        <Link href="/student/dashboard" className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE9A70]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0B0130] text-sm font-black text-[#FE9A70]">
            OSH
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[10px] font-black uppercase tracking-[0.16em] text-white/60">
              Oslo Student Hub
            </span>
            <span className="block text-base font-black text-white">Studentportal</span>
          </span>
        </Link>
        <div className="ml-3 flex shrink-0 items-center gap-2">
          <div className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-[#FE9A70] px-2 text-xs font-black text-[#140249]" aria-label={`Innlogget som ${userName}`}>
            {userInitials || "SH"}
          </div>
          <LogoutButton
            role="student"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-white/80 transition-colors hover:border-[#FE9A70]/60 hover:text-[#FE9A70] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE9A70]"
          >
            <LogOut size={18} aria-hidden="true" />
            <span className="sr-only">Logg ut</span>
          </LogoutButton>
        </div>
      </header>
      <div className="flex min-h-[calc(100svh-4rem)] lg:min-h-screen">
        <aside className="hidden w-72 shrink-0 flex-col border-r border-white/10 bg-[#140249] p-8 text-[#EDE8F5] shadow-2xl shadow-black/30 lg:flex">
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

        <main id="student-main" className="relative min-w-0 flex-1 overflow-x-clip bg-[#846AE6] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-8 lg:p-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative z-10">
            <div className="mb-10 hidden justify-end lg:flex">
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
      <nav aria-label="Mobilnavigasjon" className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 grid grid-cols-4 gap-1 rounded-2xl border border-white/15 bg-[#140249]/95 p-1.5 text-white shadow-2xl backdrop-blur lg:hidden">
        {nav.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive = activeHref === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE9A70]",
                isActive ? "bg-[#FE9A70] text-[#140249]" : "text-white/75 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon size={19} aria-hidden="true" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
