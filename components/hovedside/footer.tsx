import Link from "next/link";
import Image from "next/image";

const QUICK_LINKS = [
  { label: "Students", href: "/for-studenter" },
  { label: "Partners", href: "/partners" },
  { label: "Student Connect 2026", href: "/studentconnect2026" },
  { label: "Events", href: "/events" },
  { label: "About us", href: "/about" },
  { label: "FAQ", href: "/faq" },
];

export function Footer() {
  return (
    <footer className="bg-primary text-mist/80">
      {/* Gradient stripe */}
      <div className="h-1.5 bg-gradient-to-r from-secondary via-pink to-purple" />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 text-center md:grid-cols-3 md:text-left">
          {/* About column */}
          <div className="flex flex-col items-center md:items-start">
            <Image
              src="/brand/Logo_OSH_Gradient_whitetext.svg"
              alt="Oslo Student Hub"
              width={140}
              height={48}
            />
            <p className="mt-4 text-sm leading-relaxed">
              We connect students and companies. By building business
              partnerships, we make the transition from studies to a professional
              career smoother and more accessible.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-surface">
              Quick Links
            </h3>
            <ul className="space-y-2">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors hover:text-secondary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-surface">
              Contact
            </h3>
            <ul className="space-y-2 text-sm">
              <li>Oslo Student Hub</li>
              <li>Oslo, Norway</li>
              <li>
                <a
                  href="mailto:support@oslostudenthub.no"
                  className="transition-colors hover:text-secondary"
                >
                  support@oslostudenthub.no
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-mist/50">
          &copy; {new Date().getFullYear()} Oslo Student Hub. All rights
          reserved.
        </div>
      </div>
    </footer>
  );
}
