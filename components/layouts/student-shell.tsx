"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Building2, Ticket, LayoutDashboard, LogOut, Settings, User } from "lucide-react";
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

const iconMap = { dashboard: LayoutDashboard, profile: User, events: Ticket, companies: Building2, settings: Settings };

export function StudentShell({ nav, userName, userInitials, children }: StudentShellProps) {
  const pathname = usePathname() ?? "";
  const activeHref = pathname.startsWith("/student/companies")
    ? "/student/dashboard"
    : nav.filter((item) => pathname === item.href || (item.href !== "/student" && pathname.startsWith(`${item.href}/`)))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="student-scope min-h-screen bg-mist text-ink font-sans">
      <a href="#student-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-secondary focus:px-4 focus:py-3 focus:text-primary">Skip to content</a>
      <SessionGuard />
      <header className="sticky top-0 z-40 border-b border-white/10 bg-primary text-white">
        <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/student/events" aria-label="Oslo Student Hub — get your ticket" className="flex min-h-11 shrink-0 items-center">
            <Image src="/brand/Logo_OSH_Gradient_whitetext.svg" alt="Oslo Student Hub" width={144} height={50} priority className="h-auto w-32 sm:w-36" />
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-2 lg:flex">
            {nav.map((item) => {
              const Icon = iconMap[item.icon];
              const active = activeHref === item.href;
              return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors", active ? "bg-secondary text-primary" : "text-white hover:bg-white/10")}><Icon size={18} aria-hidden="true" />{item.label}</Link>;
            })}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/student" aria-label={`My profile, ${userName}`} className="flex h-11 min-w-11 items-center justify-center rounded-full bg-white/10 px-2 text-xs font-bold text-white">{userInitials || "SH"}</Link>
            <LogoutButton role="student" className="min-h-11 min-w-11 !p-2.5"><LogOut size={18} aria-hidden="true" /><span className="sr-only">Log out</span></LogoutButton>
          </div>
        </div>
      </header>
      <main id="student-main" className="mx-auto min-w-0 max-w-5xl px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-8 lg:pb-12">{children}</main>
      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 gap-1 border-t border-primary/15 bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 text-primary lg:hidden">
        {nav.map((item) => {
          const Icon = iconMap[item.icon];
          const active = activeHref === item.href;
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-semibold transition-colors", active ? "bg-secondary text-primary" : "text-primary/80 hover:bg-mist")}><Icon size={20} aria-hidden="true" /><span>{item.label}</span></Link>;
        })}
      </nav>
    </div>
  );
}
