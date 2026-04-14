import type { Metadata } from "next";
import Link from "next/link";
import {
  Send,
} from "lucide-react";
import { HeroSection } from "@/components/hovedside/hero-section";
import { PartnerLogoCarousel } from "@/components/hovedside/partner-logo-carousel";
import { SectionWrapper } from "@/components/hovedside/section-wrapper";
import { StatsBanner } from "@/components/hovedside/stats-banner";
import { getPartnerLogoItems } from "@/lib/hovedside/partner-logos";
import {
  formatWebsiteEventMonth,
  listWebsiteEvents,
  resolveWebsiteEventHref,
  splitWebsiteEvents,
} from "@/lib/hovedside/public-events";
import { SITE_IMAGES } from "@/lib/hovedside/site-images";

const COMPANY_REGISTRATION_URL = "https://eventregister.oslostudenthub.no/";

export const metadata: Metadata = {
  title: "Partners",
  description:
    "Meet technology students in Oslo. Partner with Oslo Student Hub for career events and recruitment.",
};

export default async function ForBedrifterPage() {
  const [events, partnerLogos] = await Promise.all([
    listWebsiteEvents(),
    getPartnerLogoItems(),
  ]);
  const { upcoming } = splitWebsiteEvents(events);
  const featuredEvents = upcoming.slice(0, 2);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <HeroSection
        title="Meet technology students in Oslo!"
        subtitle="Partner with Oslo Student Hub to connect with the next generation of engineers, developers, and innovators."
        ctaLabel="Become a partner"
        ctaHref={COMPANY_REGISTRATION_URL}
        backgroundImageSrc={SITE_IMAGES.partnersHero.src}
        backgroundImageAlt={SITE_IMAGES.partnersHero.alt}
        backgroundImagePosition="center"
      />

      {/* ── Gradient stripe ──────────────────────────────────── */}
      <div className="h-2 bg-gradient-to-r from-secondary via-pink to-purple" />

      {/* ── Upcoming events ──────────────────────────────────── */}
      <SectionWrapper bg="primary">
        {featuredEvents.length === 0 ? (
          <div className="rounded-2xl bg-white/5 p-8 ring-1 ring-white/10">
            <p className="text-sm text-mist/70">
              No upcoming events have been added in admin yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {featuredEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl bg-white/5 p-8 ring-1 ring-white/10"
              >
                <p className="text-sm font-bold uppercase tracking-wider text-secondary">
                  {formatWebsiteEventMonth(event.starts_at)}
                </p>
                <h3 className="mt-2 text-2xl font-bold text-surface">
                  {event.name}
                </h3>
                <p className="mt-2 text-sm text-mist/60">
                  {event.description ?? "More information coming soon."}
                </p>
                <Link
                  href={resolveWebsiteEventHref(event)}
                  className="mt-2 inline-block text-sm text-secondary hover:underline"
                >
                  See info here &rarr;
                </Link>
              </div>
            ))}
          </div>
        )}
      </SectionWrapper>

      {/* ── Stats ────────────────────────────────────────────── */}
      <StatsBanner
        headline="There are more than 80,000 students in Oslo."
        stats={[
          { value: "22,000", label: "Students at OsloMet" },
          { value: "26,000", label: "Students at UiO" },
          { value: "18,000", label: "Students at Høyskolen Kristiania" },
          { value: "80,000+", label: "Total students in Oslo" },
        ]}
      />

      {/* ── Contact form placeholder ─────────────────────────── */}
      <SectionWrapper>
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-2xl font-bold text-primary md:text-3xl">
            Do you want to have an event with us?
          </h2>
          <div className="mt-8 space-y-4 rounded-2xl bg-mist/40 p-8 ring-1 ring-primary/5">
            <p className="text-sm font-semibold text-primary">
              What type of event are you interested in?
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Company presentation",
                "Social event with students",
                "Help to promote for students",
                "Other",
              ].map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3 text-sm text-ink/80 ring-1 ring-primary/5"
                >
                  <input
                    type="checkbox"
                    disabled
                    className="h-4 w-4 rounded border-primary/30"
                  />
                  {option}
                </label>
              ))}
            </div>
            <button
              disabled
              className="mt-4 flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-surface opacity-50"
            >
              <Send size={14} />
              Submit
            </button>
            <p className="text-xs text-ink/40">
              Skjemaet er en placeholder og ikke koblet til backend enda.
            </p>
          </div>
        </div>
      </SectionWrapper>

      {/* ── Partners carousel ────────────────────────────────── */}
      <SectionWrapper bg="primary">
        <h2 className="mb-2 text-center text-2xl font-bold text-surface">
          Partner logo on website carousel
        </h2>
        <p className="mx-auto mb-8 max-w-xl text-center text-sm text-mist/60">
          Logos from companies and organizations Oslo Student Hub has collaborated with.
        </p>
        <PartnerLogoCarousel items={partnerLogos} />
        <p className="mt-4 text-center text-xs text-mist/40">
          Web-visbare filer i `public/Partner-site/Partner-logos` blir vist automatisk i karusellen.
        </p>
      </SectionWrapper>

      {/* ── Gradient stripe ──────────────────────────────────── */}
      <div className="h-2 bg-gradient-to-r from-secondary via-pink to-purple" />
    </>
  );
}
