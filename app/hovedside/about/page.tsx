import type { Metadata } from "next";
import { HeroSection } from "@/components/hovedside/hero-section";
import { SectionWrapper } from "@/components/hovedside/section-wrapper";
import { PlaceholderImage } from "@/components/hovedside/placeholder-image";
import { CtaSection } from "@/components/hovedside/cta-section";

export const metadata: Metadata = {
  title: "About us",
  description:
    "Oslo Student Hub is powered by a diverse group with expertise in technology, business, and communication.",
};

export default function AboutPage() {
  return (
    <>
      <HeroSection
        title="About us"
        subtitle="Oslo Student Hub is powered by a diverse group with expertise in technology, business, and communication. Together, we are dedicated to bridging the gap between academia and the professional world, creating opportunities, and fostering innovation."
      />

      <div className="h-2 bg-gradient-to-r from-secondary via-pink to-purple" />

      {/* ── Mission ──────────────────────────────────────────── */}
      <SectionWrapper>
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-primary md:text-3xl">
              Bridging the Gap to Career Success
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink/70">
              At Oslo Student Hub, our mission is to address the challenges
              students face on their journey to the professional world. We aim
              to fill the gap left by career events, such as spring career days,
              by serving as a year-round resource for students seeking guidance
              and opportunities.
            </p>
          </div>
          <PlaceholderImage alt="Team photo" />
        </div>
      </SectionWrapper>

      {/* ── Team placeholder ─────────────────────────────────── */}
      <SectionWrapper bg="mist">
        <h2 className="mb-8 text-center text-2xl font-bold text-primary">
          Our Team
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {["Member 1", "Member 2", "Member 3", "Member 4"].map((name) => (
            <div
              key={name}
              className="flex flex-col items-center rounded-2xl bg-surface p-6 text-center shadow-soft ring-1 ring-primary/5"
            >
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-purple/10 text-xl font-bold text-purple">
                {name.charAt(0)}
              </div>
              <h3 className="text-sm font-bold text-primary">{name}</h3>
              <p className="mt-1 text-xs text-ink/50">Role</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-ink/40">
          Teammedlemmer oppdateres med ekte info
        </p>
      </SectionWrapper>

      <CtaSection
        headline="Want to join our mission?"
        ctaLabel="Contact us"
        ctaHref="/contact"
      />
    </>
  );
}
