"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ChevronDown, User } from "lucide-react";

const NAV_LINKS = [
  { label: "Students", href: "/for-studenter" },
  { label: "Partners", href: "/for-bedrifter" },
  { label: "Student Connect 2026", href: "/studentconnect2026" },
  { label: "Events", href: "/events" },
];

const MORE_LINKS = [
  { label: "About us", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  function isActive(href: string) {
    const normalised = pathname.replace(/^\/hovedside/, "");
    return normalised === href || normalised.startsWith(href + "/");
  }

  return (
    <header className="sticky top-0 z-50 bg-primary text-mist">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Image
            src="/brand/Logo_OSH_Gradient_whitetext.svg"
            alt="Oslo Student Hub"
            width={160}
            height={56}
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "text-secondary"
                  : "hover:text-secondary"
              }`}
            >
              {link.label}
            </Link>
          ))}

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
                    href={link.href}
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
          <button className="hidden items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-medium transition-colors hover:text-secondary lg:flex">
            <User size={16} />
            Log In
          </button>
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
        <nav className="border-t border-white/10 px-6 pb-4 pt-2 lg:hidden">
          {[...NAV_LINKS, ...MORE_LINKS].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block py-3 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "text-secondary"
                  : "hover:text-secondary"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-white/30 py-2.5 text-sm font-medium">
            <User size={16} />
            Log In
          </button>
        </nav>
      )}
    </header>
  );
}
