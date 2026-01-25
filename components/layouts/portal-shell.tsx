"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

export function PortalShell({
  roleLabel,
  title,
  nav,
  children,
}: {
  roleLabel: string;
  title: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-mist">
      <header className="border-b border-primary/10 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">{roleLabel}</p>
            <h1 className="text-2xl font-bold text-primary">{title}</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            {nav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm font-semibold transition",
                    isActive
                      ? "bg-primary text-surface shadow-soft"
                      : "bg-primary/5 text-primary hover:bg-primary/10",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
