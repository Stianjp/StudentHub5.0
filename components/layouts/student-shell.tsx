"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/navigation/logout-button";
import { SessionGuard } from "@/components/supabase/session-guard";

type NavItem = {
  href: string;
  label: string;
  icon: ElementType;
};

type StudentShellProps = {
  nav: NavItem[];
  userName: string;
  userInitials: string;
  children: ReactNode;
};

export function StudentShell({ nav, userName, userInitials, children }: StudentShellProps) {
  const pathname = usePathname();
  const displayName = userName.split(" ")[0] || userName;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#140249] font-['Ubuntu']">
      <SessionGuard />
      <div className="flex min-h-screen">
        <aside className="w-72 shrink-0 border-r border-slate-100 bg-white p-8 shadow-2xl shadow-black/5">
          <div className="flex items-center space-x-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#140249] shadow-lg">
              <span className="text-lg font-black text-[#846AE6]">OSH</span>
            </div>
            <div>
              <h1 className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#140249]/40">
                Oslo Student Hub
              </h1>
              <p className="text-xl font-black text-[#140249]">Portal</p>
            </div>
          </div>

          <nav className="mt-12">
            <p className="mb-6 px-4 text-[11px] font-black uppercase tracking-widest text-slate-300">
              Navigasjon
            </p>
            {nav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "mb-2 flex w-full items-center space-x-3 rounded-2xl p-4 text-sm font-bold transition-all duration-300",
                    isActive
                      ? "bg-[#140249] text-white shadow-xl"
                      : "text-[#140249]/60 hover:bg-white/70 hover:text-[#140249]",
                  )}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-10 border-t border-slate-100 pt-6">
            <LogoutButton
              role="student"
              className="flex w-full items-center space-x-3 text-sm font-bold text-slate-400 transition-colors hover:text-red-500"
            >
              <span>Logg ut</span>
            </LogoutButton>
          </div>
        </aside>

        <main className="relative flex-1 overflow-y-auto bg-[#846AE6] p-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative z-10">
            <div className="mb-10 flex justify-end">
              <div className="flex items-center space-x-4 rounded-2xl bg-[#140249] px-4 py-2 text-white shadow-xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#846AE6] text-sm font-black">
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
