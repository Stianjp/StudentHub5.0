import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Clock,
  Users,
  Building2,
  Lightbulb,
  Handshake,
  Target,
} from "lucide-react";
import { HeroSection } from "@/components/hovedside/hero-section";
import { SectionWrapper } from "@/components/hovedside/section-wrapper";
import { FeatureCard } from "@/components/hovedside/feature-card";
import { CompanyGrid } from "@/components/hovedside/company-grid";
import { getApprovedCompaniesForCampaign } from "@/lib/hovedside/approved-companies";

export const metadata: Metadata = {
  title: "Student Connect 2026",
  description:
    "Biggest Student Conference in Oslo. Bridging students and industry!",
};

export default async function StudentConnect2026Page() {
  const companies = await getApprovedCompaniesForCampaign(
    "student-connect-2026",
  );

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <HeroSection
        title="Biggest Student Conference in Oslo"
        subtitle="Bridging students and industry!"
        ctaLabel="Company registration"
        ctaHref="/for-bedrifter"
        extraCtas={[
          { label: "See our stands", href: "#stands" },
          { label: "Find attending companies", href: "#companies" },
        ]}
      />

      {/* ── Intro ────────────────────────────────────────────── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-primary md:text-3xl">
            Oslo Student Hub presents Student Connect 2026!
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink/70">
            The fair aims to connect students within engineering, technology, and
            data fields with leading companies in Norway. It provides a platform
            where future talent meets innovative companies.
          </p>
          <p className="mt-4 text-base leading-relaxed text-ink/70">
            Whether you&apos;re a student exploring career opportunities or a
            company looking to engage with the next generation of professionals,
            the Student Hub is the perfect setting to connect, network, and grow.
          </p>
        </div>
      </SectionWrapper>

      {/* ── Date & Location ──────────────────────────────────── */}
      <SectionWrapper bg="primary">
        <h2 className="mb-8 text-center text-xl font-bold text-surface">
          Date and Location
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="flex flex-col items-center rounded-2xl bg-white/5 p-6 text-center ring-1 ring-white/10">
            <CalendarDays size={28} className="text-secondary" />
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-mist/60">
              Date
            </p>
            <p className="mt-1 text-lg font-bold text-surface">
              October 6th 2026
            </p>
          </div>
          <div className="flex flex-col items-center rounded-2xl bg-white/5 p-6 text-center ring-1 ring-white/10">
            <MapPin size={28} className="text-secondary" />
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-mist/60">
              Location
            </p>
            <p className="mt-1 text-lg font-bold text-surface">
              Radisson Blu Scandinavia
            </p>
          </div>
          <div className="flex flex-col items-center rounded-2xl bg-white/5 p-6 text-center ring-1 ring-white/10">
            <Clock size={28} className="text-secondary" />
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-mist/60">
              Time
            </p>
            <p className="mt-1 text-lg font-bold text-surface">
              11:00 &ndash; 15:00
            </p>
          </div>
        </div>
      </SectionWrapper>

      {/* ── For Partners ─────────────────────────────────────── */}
      <SectionWrapper bg="mist">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-primary">For Partners</h2>
          <p className="mt-4 text-base text-ink/70">
            Interested in showcasing your company? Connect with talented
            students and future professionals. Become a partner now!
          </p>
          <Link
            href="/for-bedrifter"
            className="mt-6 inline-flex items-center rounded-full border-2 border-primary bg-primary px-7 py-3 text-sm font-bold uppercase tracking-wider text-surface transition-colors hover:bg-transparent hover:text-primary"
          >
            Read More
          </Link>
        </div>
      </SectionWrapper>

      {/* ── About the Student Connect ────────────────────────── */}
      <SectionWrapper>
        <h2 className="mb-2 text-center text-2xl font-bold text-primary md:text-3xl">
          About the Student Connect
        </h2>
        <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-ink/60">
          An event dedicated to connecting students and companies, fostering
          innovation, collaboration, and career development.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={<Lightbulb size={24} />}
            title="What is the Career Fair?"
            description="An event designed to create meaningful interactions between companies and students. It's a day where innovation, collaboration, and career development take center stage."
          />
          <FeatureCard
            icon={<Target size={24} />}
            title="Who is it for?"
            description="This event is tailored for companies seeking to connect with students and graduates in engineering, technology, and data sciences, as well as for students who want to learn about career paths."
          />
          <FeatureCard
            icon={<Handshake size={24} />}
            title="Why is it important?"
            description="Strengthens ties between academia and industry. Supports students in building their professional networks. Helps companies discover fresh talent and innovative ideas."
          />
        </div>
      </SectionWrapper>

      {/* ── Highlights ───────────────────────────────────────── */}
      <SectionWrapper bg="mist">
        <h2 className="mb-2 text-center text-2xl font-bold text-primary">
          Highlights of the Event
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-center text-sm text-ink/60">
          Dedication. Expertise. Passion.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <FeatureCard
            icon={<Users size={24} />}
            title="Networking Opportunities"
            description="Students and companies can interact directly in a professional yet approachable environment."
          />
          <FeatureCard
            icon={<Building2 size={24} />}
            title="Industry Representation"
            description="Companies from various sectors participate, showcasing the diversity of opportunities available for students."
          />
        </div>
      </SectionWrapper>

      {/* ── Stands placeholder ───────────────────────────────── */}
      <SectionWrapper bg="primary" id="stands">
        <h2 className="mb-6 text-center text-2xl font-bold text-surface">
          Our Stands
        </h2>
        <div className="flex items-center justify-center rounded-2xl bg-white/5 py-16 ring-1 ring-white/10">
          <div className="text-center text-mist/40">
            <MapPin size={40} className="mx-auto" />
            <p className="mt-3 text-sm">
              Stand map and floor plan will be shown here
            </p>
          </div>
        </div>
      </SectionWrapper>

      {/* ── Approved companies (dynamic) ─────────────────────── */}
      <SectionWrapper bg="primary" id="companies">
        <h2 className="mb-2 text-center text-2xl font-bold text-surface">
          Attending Companies
        </h2>
        <p className="mx-auto mb-8 max-w-xl text-center text-sm text-mist/60">
          These companies have been confirmed for Student Connect 2026.
        </p>
        <CompanyGrid companies={companies} />
      </SectionWrapper>

      {/* ── Gradient stripe ──────────────────────────────────── */}
      <div className="h-2 bg-gradient-to-r from-secondary via-pink to-purple" />
    </>
  );
}
