"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Calendar,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Ticket,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/navigation/logout-button";
import { SessionGuard } from "@/components/supabase/session-guard";

type NavItem = { href: string; label: string; exact?: boolean; children?: { href: string; label: string }[] };
const SIDEBAR_COLLAPSED_KEY = "portal-shell-collapsed";
const SIDEBAR_COLLAPSED_EVENT = "portal-shell-collapsed-change";

function isActivePath(currentPath: string, href: string, exact = false) {
  if (href === "/") return currentPath === "/";
  if (exact) return currentPath === href;
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function resolveIcon(item: NavItem): LucideIcon {
  const href = item.href.toLowerCase();
  const label = item.label.toLowerCase();

  if (href.includes("/events") || label.includes("event")) return Calendar;
  if (href.includes("/companies") || label.includes("bedrift")) return Building2;
  if (href.includes("/students") || label.includes("student")) return Users;
  if (href.includes("/leads") || label.includes("lead")) return ClipboardList;
  if (href.includes("/forms") || label.includes("skjema")) return ClipboardList;
  if (href.includes("/jobs") || label.includes("job")) return BriefcaseBusiness;
  if (href.includes("/thesis") || label.includes("thesis")) return GraduationCap;
  if (href.includes("/crm") || label.includes("crm")) return ClipboardList;
  if (href.includes("/tickets") || label.includes("billett")) return Ticket;
  if (href.includes("/packages") || label.includes("pakke")) return Package;
  if (href.includes("/roi")) return BarChart3;
  if (href.includes("/onboarding") || label.includes("registrering")) return Settings;
  if (href === "/company") return BriefcaseBusiness;
  if (href === "/checkin") return ClipboardList;
  return LayoutDashboard;
}

function CollapsedTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-30 ml-3 -translate-y-1/2 rounded-xl border border-white/15 bg-[#0B0130] px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-xl transition duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
      {label}
    </span>
  );
}

function subscribeToCollapsedSidebar(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: Event) => {
    if (!(event instanceof StorageEvent) || event.key === SIDEBAR_COLLAPSED_KEY || event.type === SIDEBAR_COLLAPSED_EVENT) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(SIDEBAR_COLLAPSED_EVENT, handleStorage);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(SIDEBAR_COLLAPSED_EVENT, handleStorage);
  };
}

function getCollapsedSidebarSnapshot() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
}

export function PortalShell({
  roleLabel,
  title,
  nav,
  roleKey,
  backgroundClass = "bg-[#846AE6]",
  backgroundStyle,
  mainClass = "",
  children,
}: {
  roleLabel: string;
  title: string;
  nav: NavItem[];
  roleKey: "student" | "company" | "admin";
  backgroundClass?: string;
  backgroundStyle?: React.CSSProperties;
  mainClass?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isCollapsed = useSyncExternalStore(
    subscribeToCollapsedSidebar,
    getCollapsedSidebarSnapshot,
    () => false,
  );
  const rolePrefix = `/${roleKey}`;
  const basePrefix = pathname.startsWith(rolePrefix) ? rolePrefix : "";

  function normalizeHref(href: string) {
    if (!basePrefix && href.startsWith(rolePrefix)) {
      const stripped = href.replace(rolePrefix, "");
      return stripped.length === 0 ? "/" : stripped;
    }
    return href;
  }

  function toggleSidebar() {
    const next = !isCollapsed;
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
    window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_EVENT));
  }

  return (
    <div className={cn("min-h-screen overflow-x-clip text-[#EDE8F5] font-['Ubuntu']", backgroundClass)} style={backgroundStyle}>
      <a
        href="#portal-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[#FE9A70] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#140249]"
      >
        Hopp til innhold
      </a>
      <SessionGuard />
      <header className="sticky top-0 z-50 flex min-h-16 items-center justify-between border-b border-white/10 bg-[#140249]/95 px-4 py-2.5 text-white shadow-lg backdrop-blur lg:hidden">
        <Link
          href={normalizeHref(`/${roleKey}`)}
          onClick={() => setMobileMenuOpen(false)}
          className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE9A70]"
        >
          <Image
            src="/brand/Logo_OSH_Gradient_whitetext.svg"
            alt="Oslo Student Hub"
            width={132}
            height={36}
            className="h-auto w-[116px] shrink-0 sm:w-[132px]"
            priority
          />
          <span className="min-w-0 border-l border-white/15 pl-3">
            <span className="block text-[10px] font-black uppercase tracking-wider text-[#FE9A70]">{roleLabel}</span>
            <span className="block max-w-28 truncate text-xs font-bold text-white sm:max-w-48">{title}</span>
          </span>
        </Link>
        <button
          type="button"
          aria-expanded={mobileMenuOpen}
          aria-controls="portal-mobile-menu"
          aria-label={mobileMenuOpen ? "Lukk meny" : "Åpne meny"}
          onClick={() => setMobileMenuOpen((current) => !current)}
          className="ml-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white transition-colors hover:border-[#FE9A70]/70 hover:text-[#FE9A70] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE9A70]"
        >
          {mobileMenuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </header>

      {mobileMenuOpen ? (
        <div className="fixed inset-x-0 bottom-0 top-16 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Lukk meny"
            onClick={() => setMobileMenuOpen(false)}
            className="portal-mobile-overlay absolute inset-0 h-full w-full border-0 bg-[#0B0130]/65 backdrop-blur-sm"
          />
          <div
            id="portal-mobile-menu"
            className="relative z-10 flex h-full w-[min(22rem,calc(100%-2rem))] flex-col overflow-y-auto border-r border-white/10 bg-[#140249] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5 text-white shadow-2xl"
          >
            <p className="mb-3 px-3 text-[11px] font-black uppercase tracking-widest text-white/55">Navigasjon</p>
            <nav className="grid gap-1" aria-label={`${roleLabel}-navigasjon`}>
              {nav.map((item) => {
                const Icon = resolveIcon(item);
                const itemHref = normalizeHref(item.href);
                const children = (item.children ?? []).map((child) => ({ ...child, href: normalizeHref(child.href) }));
                const isActive =
                  isActivePath(pathname, itemHref, item.exact ?? false) ||
                  children.some((child) => isActivePath(pathname, child.href));

                return (
                  <div key={item.href} className="grid gap-1">
                    <Link
                      href={itemHref}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE9A70]",
                        isActive
                          ? "border-[#FE9A70] bg-[#FE9A70] text-[#140249]"
                          : "border-transparent text-white/85 hover:border-white/15 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <Icon size={19} className="shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                    {children.length > 0 ? (
                      <div className="mb-1 ml-6 grid gap-1 border-l border-white/15 pl-3">
                        {children.map((child) => {
                          const childIsActive = isActivePath(pathname, child.href);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              aria-current={childIsActive ? "page" : undefined}
                              onClick={() => setMobileMenuOpen(false)}
                              className={cn(
                                "rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE9A70]",
                                childIsActive ? "bg-[#FE9A70]/20 text-[#FE9A70]" : "text-white/65 hover:bg-white/10 hover:text-white",
                              )}
                            >
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </nav>
            <div className="mt-auto border-t border-white/10 pt-4">
              <LogoutButton
                role={roleKey}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-white/80 hover:border-[#FE9A70]/70 hover:text-[#FE9A70] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE9A70]"
              >
                <LogOut size={18} aria-hidden="true" />
                <span>Logg ut</span>
              </LogoutButton>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-[calc(100svh-4rem)] lg:min-h-screen">
        <aside className={cn(
          "hidden shrink-0 border-r border-white/10 bg-[#140249] text-[#EDE8F5] shadow-2xl shadow-black/30 transition-[width,padding] duration-200 lg:block",
          isCollapsed ? "w-24 p-4" : "w-72 p-8",
        )}>
          <div className={cn("flex", isCollapsed ? "justify-center" : "justify-start")}>
            <button
              type="button"
              onClick={toggleSidebar}
              className={cn(
                "group relative inline-flex items-center rounded-2xl border border-white/10 bg-[#0B0130] text-[#EDE8F5] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE9A70] focus-visible:ring-offset-2 focus-visible:ring-offset-[#140249]",
                "hover:border-[#FE9A70]/70 hover:bg-[#1A074E]",
                isCollapsed ? "justify-center px-3 py-4" : "w-full justify-start px-4 py-3",
              )}
              title={isCollapsed ? "Maksimer sidebar" : "Minimer sidebar"}
              aria-label={isCollapsed ? "Maksimer sidebar" : "Minimer sidebar"}
            >
              {isCollapsed ? (
                <span className="block text-center text-xs font-black tracking-[0.35em] text-[#EDE8F5]">OSH</span>
              ) : (
                <Image
                  src="/brand/Logo_OSH_Gradient_whitetext.svg"
                  alt="Oslo Student Hub"
                  width={260}
                  height={64}
                  className="h-auto w-full object-contain"
                  priority
                />
              )}
              {isCollapsed ? <CollapsedTooltip label={isCollapsed ? "Maksimer sidebar" : "Minimer sidebar"} /> : null}
            </button>
          </div>

          <nav className="mt-12">
            {!isCollapsed ? (
              <p className="mb-6 px-4 text-[11px] font-black uppercase tracking-widest text-[#EDE8F5]/55">
                Navigasjon
              </p>
            ) : null}
            {nav.map((item) => {
              const Icon = resolveIcon(item);
              const itemHref = normalizeHref(item.href);
              const itemIsActive = isActivePath(pathname, itemHref, item.exact ?? false);
              const children = (item.children ?? []).map((child) => ({
                ...child,
                href: normalizeHref(child.href),
              }));
              const hasActiveChild = children.some((child) => isActivePath(pathname, child.href));
              const isActive = itemIsActive || hasActiveChild;

              return (
                <div key={item.href} className="mb-2">
                  <Link
                    href={itemHref}
                    title={item.label}
                    className={cn(
                      "group relative flex w-full items-center rounded-2xl border border-transparent p-4 text-sm font-bold transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE9A70] focus-visible:ring-offset-2 focus-visible:ring-offset-[#140249]",
                      isCollapsed ? "justify-center" : "justify-between",
                      isActive
                        ? "border-[#F2A786] bg-[#F3A17B] text-[#140249]"
                        : "text-[#EDE8F5] hover:border-[#FE9A70]/70 hover:bg-[#1E0B62] hover:text-white",
                    )}
                  >
                    <span className="flex items-center space-x-3">
                      <Icon size={20} aria-hidden="true" />
                      {!isCollapsed ? <span>{item.label}</span> : null}
                    </span>
                    {isCollapsed ? <CollapsedTooltip label={item.label} /> : null}
                    {!isCollapsed && children.length > 0 ? (
                      <span className={cn("rounded-full px-2 py-1 text-[10px] font-black", isActive ? "bg-[#140249]/12" : "bg-[#FE9A70]/15")}>
                        {children.length}
                      </span>
                    ) : null}
                  </Link>

                  {!isCollapsed && children.length > 0 ? (
                    <div className="ml-7 mt-2 grid gap-1">
                      {children.map((child) => {
                        const childIsActive = isActivePath(pathname, child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "rounded-xl border px-3 py-2 text-xs font-semibold transition-[background-color,border-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE9A70] focus-visible:ring-offset-2 focus-visible:ring-offset-[#140249]",
                              childIsActive
                                ? "border-[#FE9A70]/90 bg-[#FE9A70]/20 text-[#FE9A70]"
                                : "border-transparent text-[#EDE8F5]/75 hover:border-[#FE9A70]/45 hover:bg-[#1E0B62] hover:text-[#EDE8F5]",
                            )}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className="mt-10 border-t border-white/10 pt-6">
            <LogoutButton
              role={roleKey}
              className={cn(
                "group relative flex w-full items-center rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-[#EDE8F5]/70 transition-colors hover:text-[#FE9A70]",
                isCollapsed ? "justify-center" : "justify-start",
              )}
            >
              {!isCollapsed ? <span>Logg ut</span> : <span>↩</span>}
              {isCollapsed ? <CollapsedTooltip label="Logg ut" /> : null}
            </LogoutButton>
          </div>
        </aside>

        <main id="portal-main" className="relative min-w-0 flex-1 overflow-x-clip bg-[#846AE6] px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-8 lg:p-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative z-10">
            <div className="mb-10 hidden justify-end lg:flex">
              <div className="flex items-center gap-3 rounded-2xl bg-[#140249] px-4 py-2 text-white shadow-xl ring-1 ring-white/15">
                <span className="rounded-full bg-[#FE9A70] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#140249]">
                  {roleLabel}
                </span>
                <span className="text-sm font-bold">{title}</span>
              </div>
            </div>
            <div className={mainClass}>{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
