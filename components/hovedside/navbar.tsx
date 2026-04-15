"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ChevronDown, User } from "lucide-react";

type NavLink = {
  label: string;
  href: string;
  children?: NavLink[];
};

const NAV_LINKS: NavLink[] = [
  { label: "Students", href: "/for-studenter" },
  {
    label: "Partners",
    href: "/partners",
    children: [{ label: "Student Connect 2026", href: "/studentconnect2026" }],
  },
  { label: "Events", href: "/events" },
  { label: "Jobs", href: "/jobs" },
  { label: "Thesis", href: "/thesis-projects" },
];

const MORE_LINKS: NavLink[] = [
  { label: "About us", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

const LOGIN_LINKS: NavLink[] = [
  { label: "Student", href: "https://student.oslostudenthub.no/" },
  { label: "Company", href: "https://bedrift.oslostudenthub.no/" },
];

export function Navbar({ baseUrl }: { baseUrl?: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  function resolveHref(href: string) {
    if (!baseUrl) return href;
    return new URL(href, baseUrl).toString();
  }

  function isActive(href: string) {
    if (baseUrl) return false;
    const normalised = pathname.replace(/^\/hovedside/, "");
    return normalised === href || normalised.startsWith(href + "/");
  }

  return (
    <header className="sticky top-0 z-50 bg-primary text-mist">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link href={resolveHref("/")} className="shrink-0">
          <Image
            src="/brand/Logo_OSH_Gradient_whitetext.svg"
            alt="Oslo Student Hub"
            width={144}
            height={50}
            priority
            className="h-auto w-[128px] sm:w-[144px]"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) =>
            link.children ? (
              <div
                key={link.href}
                className="group relative"
              >
                <Link
                  href={resolveHref(link.href)}
                  className={`flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive(link.href) || link.children.some((child) => isActive(child.href))
                      ? "text-secondary"
                      : "hover:text-secondary"
                  }`}
                >
                  {link.label}
                  <ChevronDown size={14} className="transition-transform group-hover:rotate-180" />
                </Link>
                <div className="invisible absolute left-0 top-full mt-1 min-w-52 rounded-xl bg-primary/95 py-2 opacity-0 shadow-lg ring-1 ring-white/10 backdrop-blur-sm transition-all group-hover:visible group-hover:opacity-100">
                  {link.children.map((child) => (
                    <Link
                      key={child.href}
                      href={resolveHref(child.href)}
                      className={`block px-4 py-2 text-sm transition-colors ${
                        isActive(child.href)
                          ? "text-secondary"
                          : "opacity-80 hover:text-secondary hover:opacity-100"
                      }`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link
                key={link.href}
                href={resolveHref(link.href)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "text-secondary"
                    : "hover:text-secondary"
                }`}
              >
                {link.label}
              </Link>
            ),
          )}

          {/* More dropdown */}
          <div className="relative">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              onBlur={() => setTimeout(() => setMoreOpen(false), 150)}
              className={`flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                MORE_LINKS.some((l) => isActive(l.href))
                  ? "text-secondary"
                  : "hover:text-secondary"
              }`}
            >
              More
              <ChevronDown
                size={14}
                className={`transition-transform ${moreOpen ? "rotate-180" : ""}`}
              />
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-primary/95 py-2 shadow-lg ring-1 ring-white/10 backdrop-blur-sm">
                {MORE_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={resolveHref(link.href)}
                    className={`block px-4 py-2 text-sm transition-colors ${
                      isActive(link.href)
                        ? "text-secondary"
                        : "opacity-80 hover:text-secondary hover:opacity-100"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Log In + mobile toggle */}
        <div className="flex items-center gap-3">
          <div className="relative hidden lg:block">
            <button
              onClick={() => setLoginOpen(!loginOpen)}
              onBlur={() => setTimeout(() => setLoginOpen(false), 150)}
              className="flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-medium transition-colors hover:text-secondary"
            >
              <User size={16} />
              Log In
              <ChevronDown size={14} className={`transition-transform ${loginOpen ? "rotate-180" : ""}`} />
            </button>
            {loginOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 rounded-xl bg-primary/95 py-2 shadow-lg ring-1 ring-white/10 backdrop-blur-sm">
                {LOGIN_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={resolveHref(link.href)}
                    className="block px-4 py-2 text-sm opacity-80 transition-colors hover:text-secondary hover:opacity-100"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <button
            className="rounded-lg p-2 hover:text-secondary lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="border-t border-white/10 px-4 pb-4 pt-2 sm:px-6 lg:hidden">
          {[...NAV_LINKS, ...MORE_LINKS].map((link) =>
            "children" in link && link.children ? (
              <div key={link.href} className="py-2">
                <Link
                  href={resolveHref(link.href)}
                  onClick={() => setMobileOpen(false)}
                  className={`block py-2 text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? "text-secondary"
                      : "hover:text-secondary"
                  }`}
                >
                  {link.label}
                </Link>
                <div className="pl-4">
                  {link.children.map((child) => (
                    <Link
                      key={child.href}
                      href={resolveHref(child.href)}
                      onClick={() => setMobileOpen(false)}
                      className={`block py-2 text-sm transition-colors ${
                        isActive(child.href)
                          ? "text-secondary"
                          : "text-mist/80 hover:text-secondary"
                      }`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link
                key={link.href}
                href={resolveHref(link.href)}
                onClick={() => setMobileOpen(false)}
                className={`block py-3 text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "text-secondary"
                    : "hover:text-secondary"
                }`}
              >
                {link.label}
              </Link>
            ),
          )}
          <div className="mt-3 grid gap-2">
            {LOGIN_LINKS.map((link) => (
              <Link
                key={link.href}
                href={resolveHref(link.href)}
                onClick={() => setMobileOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-white/30 py-2.5 text-sm font-medium transition-colors hover:text-secondary"
              >
                <User size={16} />
                {link.label} Log In
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
