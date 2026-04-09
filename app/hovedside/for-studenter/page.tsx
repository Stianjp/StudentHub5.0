import type { Metadata } from "next";
import Link from "next/link";
import { Users, GraduationCap, CalendarDays, School } from "lucide-react";
import { HeroSection } from "@/components/hovedside/hero-section";
import { SectionWrapper } from "@/components/hovedside/section-wrapper";
import { FeatureCard } from "@/components/hovedside/feature-card";
import { StatsBanner } from "@/components/hovedside/stats-banner";
import { CtaSection } from "@/components/hovedside/cta-section";
import {
  formatWebsiteEventMonth,
  listWebsiteEvents,
  resolveWebsiteEventHref,
  splitWebsiteEvents,
} from "@/lib/hovedside/public-events";

export const metadata: Metadata = {
  title: "Students",
  description:
    "Are you a student looking for a job or thesis? Join Oslo Student Hub to connect with top companies.",
};

export default async function ForStudenterPage() {
  const events = await listWebsiteEvents();
  const { upcoming } = splitWebsiteEvents(events);
  const featuredEvent = upcoming[0] ?? null;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <HeroSection
        title="WE CONNECT STUDENTS & COMPANIES"
        subtitle="Are you a student looking for a job or thesis? Sign up here!"
        ctaLabel="Register"
        ctaHref="#register"
      />

      {/* ── Gradient stripe ──────────────────────────────────── */}
      <div className="h-2 bg-gradient-to-r from-secondary via-pink to-purple" />

      {/* ── Learn and network ────────────────────────────────── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-primary md:text-3xl">
            Learn and network.
          </h2>
          <h3 className="mt-1 text-2xl font-bold text-purple md:text-3xl">
            Join our community!
          </h3>
          <p className="mt-4 text-base leading-relaxed text-ink/70">
            Network, network and lastly network. We give you access to the best
            conferences and events in Oslo, where you can build connections and
            meet your future employers.
          </p>
        </div>
      </SectionWrapper>

      {/* ── Upcoming event ───────────────────────────────────── */}
      <SectionWrapper bg="primary">
        <div className="mx-auto max-w-lg text-center">
          {featuredEvent ? (
            <>
              <p className="text-sm font-bold uppercase tracking-wider text-secondary">
                {formatWebsiteEventMonth(featuredEvent.starts_at)}
              </p>
              <h3 className="mt-2 text-2xl font-bold text-surface">
                {featuredEvent.name}
              </h3>
              <p className="mt-3 text-sm text-mist/60">
                {featuredEvent.description ??
                  "More information coming soon. Register to stay updated."}
              </p>
              <Link
                href={resolveWebsiteEventHref(featuredEvent)}
                className="mt-6 inline-flex items-center rounded-full border-2 border-secondary px-7 py-3 text-sm font-bold uppercase tracking-wider text-secondary transition-colors hover:bg-secondary hover:text-primary"
              >
                Learn more
              </Link>
            </>
          ) : (
            <>
              <h3 className="mt-2 text-2xl font-bold text-surface">
                Upcoming events
              </h3>
              <p className="mt-3 text-sm text-mist/60">
                No upcoming events have been added in admin yet.
              </p>
            </>
          )}
        </div>
      </SectionWrapper>

      {/* ── University stats ─────────────────────────────────── */}
      <SectionWrapper>
        <h2 className="mb-8 text-center text-2xl font-bold text-primary">
          All the students in Oslo
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { value: "26,000+", label: "UiO", icon: <School size={24} /> },
            {
              value: "22,000+",
              label: "OsloMet",
              icon: <GraduationCap size={24} />,
            },
            {
              value: "18,000+",
              label: "Høyskolen Kristiania",
              icon: <Users size={24} />,
            },
            { value: "NMBU", label: "& more", icon: <School size={24} /> },
          ].map((uni) => (
            <div
              key={uni.label}
              className="flex flex-col items-center rounded-2xl bg-mist/40 p-6 text-center ring-1 ring-primary/5"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-purple/10 text-purple">
                {uni.icon}
              </div>
              <p className="text-2xl font-bold text-primary">{uni.value}</p>
              <p className="mt-1 text-sm text-ink/60">{uni.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-ink/60">
          Find the next events we are doing at your university!
        </p>
      </SectionWrapper>

      {/* ── What we offer ────────────────────────────────────── */}
      <SectionWrapper bg="mist">
        <h2 className="mb-8 text-center text-2xl font-bold text-primary">
          What we offer students
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={<CalendarDays size={24} />}
            title="Career Events"
            description="Attend career fairs, company presentations, and networking events to meet your future employer face to face."
          />
          <FeatureCard
            icon={<Users size={24} />}
            title="Networking"
            description="Build your professional network early. Connect with industry professionals and fellow ambitious students."
          />
          <FeatureCard
            icon={<GraduationCap size={24} />}
            title="Skill Building"
            description="Workshops, CV reviews, and interview prep to help you stand out in the job market."
          />
        </div>
      </SectionWrapper>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <CtaSection
        headline="Ready to start your career journey?"
        ctaLabel="Student Connect 2026"
        ctaHref="/studentconnect2026"
      />
    </>
  );
}
