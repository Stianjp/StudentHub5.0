import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MapPin, ArrowRight } from "lucide-react";
import { HeroSection } from "@/components/hovedside/hero-section";
import { SectionWrapper } from "@/components/hovedside/section-wrapper";

export const metadata: Metadata = {
  title: "Events",
  description: "Upcoming and past events organized by Oslo Student Hub.",
};

const UPCOMING_EVENTS = [
  {
    month: "April 2026",
    name: "Women in STEM",
    location: "TBA",
    description: "More information coming soon.",
    href: "#",
  },
  {
    month: "October 2026",
    name: "Student Connect 2026",
    location: "Radisson Blu Scandinavia",
    description:
      "The biggest student conference in Oslo. Bridging students and industry!",
    href: "/studentconnect2026",
  },
];

const PAST_EVENTS = [
  {
    date: "2025",
    name: "Næringslivsdagen (ND) 2025 OsloMet",
  },
  {
    date: "2025",
    name: "Hackathon x NITO",
  },
  {
    date: "2025",
    name: "SHE Conference",
  },
  {
    date: "2025",
    name: "Energima x Company Presentation",
  },
];

export default function EventsPage() {
  return (
    <>
      <HeroSection
        title="Events"
        subtitle="Discover exciting student events and conferences. Join us to network, learn, and have fun."
      />

      <div className="h-2 bg-gradient-to-r from-secondary via-pink to-purple" />

      {/* ── Upcoming ─────────────────────────────────────────── */}
      <SectionWrapper>
        <h2 className="mb-8 text-2xl font-bold text-primary">
          Upcoming Events
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {UPCOMING_EVENTS.map((event) => (
            <div
              key={event.name}
              className="rounded-2xl bg-surface p-6 shadow-soft ring-1 ring-primary/5 transition hover:-translate-y-0.5"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-purple">
                {event.month}
              </p>
              <h3 className="mt-2 text-xl font-bold text-primary">
                {event.name}
              </h3>
              <div className="mt-3 flex items-center gap-2 text-sm text-ink/60">
                <MapPin size={14} />
                {event.location}
              </div>
              <p className="mt-3 text-sm text-ink/70">{event.description}</p>
              {event.href !== "#" && (
                <Link
                  href={event.href}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-secondary hover:underline"
                >
                  Learn more <ArrowRight size={14} />
                </Link>
              )}
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Past events ──────────────────────────────────────── */}
      <SectionWrapper bg="mist">
        <h2 className="mb-8 text-2xl font-bold text-primary">Past Events</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {PAST_EVENTS.map((event) => (
            <div
              key={event.name}
              className="flex items-center gap-4 rounded-xl bg-surface px-5 py-4 ring-1 ring-primary/5"
            >
              <CalendarDays size={20} className="shrink-0 text-purple/60" />
              <div>
                <p className="text-sm font-semibold text-primary">
                  {event.name}
                </p>
                <p className="text-xs text-ink/50">{event.date}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>
    </>
  );
}
