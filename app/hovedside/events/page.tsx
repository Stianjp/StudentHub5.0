import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MapPin, ArrowRight } from "lucide-react";
import { HeroSection } from "@/components/hovedside/hero-section";
import { SectionWrapper } from "@/components/hovedside/section-wrapper";
import {
  formatWebsiteEventDate,
  formatWebsiteEventMonth,
  listWebsiteEvents,
  resolveWebsiteEventHref,
  splitWebsiteEvents,
} from "@/lib/hovedside/public-events";
import { SITE_IMAGES } from "@/lib/hovedside/site-images";

export const metadata: Metadata = {
  title: "Events",
  description: "Upcoming and past events organized by Oslo Student Hub.",
};

export default async function EventsPage() {
  const events = await listWebsiteEvents();
  const { upcoming, past } = splitWebsiteEvents(events);

  return (
    <>
      <HeroSection
        title="Events"
        subtitle="Discover exciting student events and conferences. Join us to network, learn, and have fun."
        backgroundImageSrc={SITE_IMAGES.homeHero.src}
        backgroundImageAlt={SITE_IMAGES.homeHero.alt}
        backgroundImagePosition="center"
      />

      <div className="h-2 bg-gradient-to-r from-secondary via-pink to-purple" />

      {/* ── Upcoming ─────────────────────────────────────────── */}
      <SectionWrapper>
        <h2 className="mb-8 text-2xl font-bold text-primary">
          Upcoming Events
        </h2>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl bg-surface p-6 shadow-soft ring-1 ring-primary/5">
            <p className="text-sm text-ink/70">
              No upcoming events have been added in admin yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {upcoming.map((event) => (
            <div
              key={event.name}
              id={event.slug}
              className="rounded-2xl bg-surface p-6 shadow-soft ring-1 ring-primary/5 transition hover:-translate-y-0.5"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-purple">
                {formatWebsiteEventMonth(event.starts_at)}
              </p>
              <h3 className="mt-2 text-xl font-bold text-primary">
                {event.name}
              </h3>
              <div className="mt-3 flex items-center gap-2 text-sm text-ink/60">
                <MapPin size={14} />
                {event.location ?? "Location to be confirmed"}
              </div>
              <p className="mt-2 text-xs font-semibold text-ink/50">
                {formatWebsiteEventDate(event.starts_at)}
              </p>
              <p className="mt-3 text-sm text-ink/70">
                {event.description ?? "More information coming soon."}
              </p>
              <Link
                href={resolveWebsiteEventHref(event)}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-secondary hover:underline"
              >
                Learn more <ArrowRight size={14} />
              </Link>
            </div>
            ))}
          </div>
        )}
      </SectionWrapper>

      {/* ── Past events ──────────────────────────────────────── */}
      <SectionWrapper bg="mist">
        <h2 className="mb-8 text-2xl font-bold text-primary">Past Events</h2>
        {past.length === 0 ? (
          <div className="rounded-2xl bg-surface p-6 shadow-soft ring-1 ring-primary/5">
            <p className="text-sm text-ink/70">
              Past events will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {past.map((event) => (
            <div
              key={event.name}
              id={event.slug}
              className="flex items-center gap-4 rounded-xl bg-surface px-5 py-4 ring-1 ring-primary/5"
            >
              <CalendarDays size={20} className="shrink-0 text-purple/60" />
              <div>
                <p className="text-sm font-semibold text-primary">
                  {event.name}
                </p>
                <p className="text-xs text-ink/50">
                  {formatWebsiteEventDate(event.starts_at)}
                </p>
              </div>
            </div>
            ))}
          </div>
        )}
      </SectionWrapper>
    </>
  );
}
