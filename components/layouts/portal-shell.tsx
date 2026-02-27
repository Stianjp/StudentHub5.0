"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Calendar,
  ClipboardList,
  LayoutDashboard,
  Package,
  Settings,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/navigation/logout-button";
import { SessionGuard } from "@/components/supabase/session-guard";

type NavItem = { href: string; label: string; exact?: boolean; children?: { href: string; label: string }[] };

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
  if (href.includes("/crm") || label.includes("crm")) return ClipboardList;
  if (href.includes("/tickets") || label.includes("billett")) return Ticket;
  if (href.includes("/packages") || label.includes("pakke")) return Package;
  if (href.includes("/roi")) return BarChart3;
  if (href.includes("/onboarding") || label.includes("registrering")) return Settings;
  if (href === "/company") return BriefcaseBusiness;
  if (href === "/checkin") return ClipboardList;
  return LayoutDashboard;
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
  const rolePrefix = `/${roleKey}`;
  const basePrefix = pathname.startsWith(rolePrefix) ? rolePrefix : "";

  function normalizeHref(href: string) {
    if (!basePrefix && href.startsWith(rolePrefix)) {
      const stripped = href.replace(rolePrefix, "");
      return stripped.length === 0 ? "/" : stripped;
    }
    return href;
  }

  return (
    <div className={cn("min-h-screen text-[#EDE8F5] font-['Ubuntu']", backgroundClass)} style={backgroundStyle}>
      <a
        href="#portal-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[#FE9A70] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#140249]"
      >
        Hopp til innhold
      </a>
      <SessionGuard />
      <div className="flex min-h-screen">
        <aside className="w-72 shrink-0 border-r border-white/10 bg-[#140249] p-8 text-[#EDE8F5] shadow-2xl shadow-black/30">
          <div className="rounded-2xl border border-white/10 bg-[#0B0130] px-4 py-3">
            <Image
              src="/brand/Logo_OSH_Gradient_whitetext.svg"
              alt="Oslo Student Hub"
              width={260}
              height={64}
              className="h-auto w-full object-contain"
              priority
            />
          </div>

          <nav className="mt-12">
            <p className="mb-6 px-4 text-[11px] font-black uppercase tracking-widest text-[#EDE8F5]/55">
              Navigasjon
            </p>
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
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl border border-transparent p-4 text-sm font-bold transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE9A70] focus-visible:ring-offset-2 focus-visible:ring-offset-[#140249]",
                      isActive
                        ? "border-[#F2A786] bg-[#F3A17B] text-[#140249]"
                        : "text-[#EDE8F5] hover:border-[#FE9A70]/70 hover:bg-[#1E0B62] hover:text-white",
                    )}
                  >
                    <span className="flex items-center space-x-3">
                      <Icon size={20} aria-hidden="true" />
                      <span>{item.label}</span>
                    </span>
                    {children.length > 0 ? (
                      <span className={cn("rounded-full px-2 py-1 text-[10px] font-black", isActive ? "bg-[#140249]/12" : "bg-[#FE9A70]/15")}>
                        {children.length}
                      </span>
                    ) : null}
                  </Link>

                  {children.length > 0 ? (
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
              className="flex w-full items-center justify-start rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-[#EDE8F5]/70 transition-colors hover:text-[#FE9A70]"
            >
              <span>Logg ut</span>
            </LogoutButton>
          </div>
        </aside>

        <main id="portal-main" className="relative flex-1 overflow-y-auto bg-[#846AE6] p-6 md:p-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative z-10">
            <div className="mb-10 flex justify-end">
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
