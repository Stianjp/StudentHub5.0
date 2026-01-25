"use client";

import Image from "next/image";
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
      <header className="border-b border-primary/10">
        <div className="bg-primary text-surface">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface/10 ring-1 ring-white/15">
                <Image
                  src="/brand/logo.svg"
                  alt="Oslo Student Hub"
                  width={36}
                  height={36}
                  className="h-9 w-9 object-contain"
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-secondary/90">
                  Oslo Student Hub
                </p>
                <h1 className="text-2xl font-bold">{title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                {roleLabel}
              </span>
              <Link
                href="/"
                className="rounded-full bg-surface/10 px-4 py-2 text-xs font-semibold text-surface transition hover:bg-surface/20"
              >
                Hjem
              </Link>
            </div>
          </div>
        </div>
        <div className="bg-surface/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">
              Portalmeny
            </p>
            <nav className="flex flex-wrap items-center gap-2">
              {nav.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-semibold transition",
                      isActive
                        ? "border-primary bg-primary text-surface shadow-soft"
                        : "border-primary/15 bg-surface text-primary hover:border-primary/40 hover:bg-mist",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
