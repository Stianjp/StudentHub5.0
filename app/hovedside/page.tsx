import Link from "next/link";
import {
  Compass,
  Users,
  CalendarDays,
  GraduationCap,
  Rocket,
  HeartHandshake,
} from "lucide-react";
import { HeroSection } from "@/components/hovedside/hero-section";
import { SectionWrapper } from "@/components/hovedside/section-wrapper";
import { FeatureCard } from "@/components/hovedside/feature-card";
import { StatsBanner } from "@/components/hovedside/stats-banner";
import { CtaSection } from "@/components/hovedside/cta-section";
import { CompanyGrid } from "@/components/hovedside/company-grid";
import { StudentConnectEventCallout } from "@/components/hovedside/student-connect-event-callout";
import { getApprovedCompaniesForCampaign } from "@/lib/hovedside/approved-companies";
import {
  formatWebsiteEventMonth,
  getWebsiteEventDescription,
  listWebsiteEvents,
  resolveWebsiteEventHref,
  splitWebsiteEvents,
} from "@/lib/hovedside/public-events";
import { SITE_IMAGES } from "@/lib/hovedside/site-images";

export default async function HomePage() {
  const [events, companies] = await Promise.all([
    listWebsiteEvents(),
    getApprovedCompaniesForCampaign("student-connect-2026"),
  ]);
  const { upcoming } = splitWebsiteEvents(events);
  const featuredEvents = upcoming.slice(0, 2);
  const studentConnectEvent =
    upcoming.find((event) => event.slug === "student-connect-2026") ?? null;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <HeroSection
        title="WE CONNECT STUDENTS & COMPANIES"
        subtitle="By building business partnerships, we make the transition from studies to a professional career smoother and more accessible for students"
        ctaLabel="Register student"
        ctaHref="/Students"
        ctaDescription="Students: register or sign in, then open Events to get your free ticket."
        extraCtas={[{ label: "Register company", href: "/partners" }]}
        backgroundImageSrc={SITE_IMAGES.homeHero.src}
        backgroundImageAlt={SITE_IMAGES.homeHero.alt}
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
                  {getWebsiteEventDescription(event)}
                </p>
                <Link
                  href={resolveWebsiteEventHref(event)}
                  prefetch={false}
                  className="mt-2 inline-block text-sm text-secondary hover:underline"
                >
                  See info here &rarr;
                </Link>
              </div>
            ))}
          </div>
        )}
      </SectionWrapper>

      {/* ── Why join OSH ─────────────────────────────────────── */}
      <SectionWrapper>
        <h2 className="mb-10 text-center text-2xl font-bold text-primary md:text-3xl">
          Why you should join Oslo Student Hub
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={<Compass size={24} />}
            title="Guidance"
            description="The job market is changing and grades are not enough to get a job. We help you to understand the market and build your profile."
          />
          <FeatureCard
            icon={<Users size={24} />}
            title="Network"
            description="Network, network and lastly network. We give you access to the best conferences and events in Oslo, where you can build connections and meet your future employers."
          />
          <FeatureCard
            icon={<CalendarDays size={24} />}
            title="Events"
            description="From career-building workshops to social gatherings, our meetups connect you with peers and industry leaders, fueling personal and professional growth."
          />
        </div>
      </SectionWrapper>

      {/* ── Stats banner ─────────────────────────────────────── */}
      <StatsBanner
        headline="There are more than 80,000 students in Oslo."
        stats={[
          { value: "22,000", label: "Students at OsloMet" },
          { value: "26,000", label: "Students at UiO" },
          { value: "18,000", label: "Students at Høyskolen Kristiania" },
          { value: "80,000+", label: "Total students in Oslo" },
        ]}
      />

      {/* ── Services ─────────────────────────────────────────── */}
      <SectionWrapper bg="mist">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<CalendarDays size={24} />}
            title="Student Events"
            description="Discover exciting student events and conferences organized by us. Join us to network, learn, and have fun with fellow students."
          />
          <FeatureCard
            icon={<Rocket size={24} />}
            title="Skill Development"
            description="Enhance your skills through workshops and training sessions. Stay ahead in your academic and professional journey with us."
          />
          <FeatureCard
            icon={<GraduationCap size={24} />}
            title="Career Opportunities"
            description="Explore career opportunities through our platform. Connect with top companies looking for talented students like you."
          />
          <FeatureCard
            icon={<HeartHandshake size={24} />}
            title="Community Support"
            description="Join a supportive community of students and professionals. Get guidance, advice, and mentorship to excel in your endeavors."
          />
        </div>
      </SectionWrapper>

      {/* ── Student Connect ticket ───────────────────────────── */}
      <StudentConnectEventCallout event={studentConnectEvent} />

      {/* ── Partners ─────────────────────────────────────────── */}
      <SectionWrapper bg="primary">
        <h2 className="mb-2 text-center text-2xl font-bold text-surface">
          Our partners
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-mist/60">
          Confirmed partners for Student Connect 2026, sorted by package from
          Platinum to Standard. Hover or click a company to read a short
          presentation.
        </p>
        <CompanyGrid companies={companies} compactOnMobile />
      </SectionWrapper>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <CtaSection
        headline="Ready for Student Connect 2026?"
        ctaLabel="Learn more"
        ctaHref="/studentconnect2026"
      />
    </>
  );
}
