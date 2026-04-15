import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Linkedin } from "lucide-react";
import { HeroSection } from "@/components/hovedside/hero-section";
import { SectionWrapper } from "@/components/hovedside/section-wrapper";
import { CtaSection } from "@/components/hovedside/cta-section";
import { SITE_IMAGES } from "@/lib/hovedside/site-images";

export const metadata: Metadata = {
  title: "About us",
  description:
    "Oslo Student Hub is powered by a diverse group with expertise in technology, business, and communication.",
};

const TEAM_MEMBERS = [
  {
    name: "Amruta C. Bojedla",
    role: "Co-founder & CEO of Oslo Student Hub",
    imageSrc: "/Partner-site/About-Us/CEO_Amruta.jpg",
    imageAlt: "Amruta C. Bojedla",
    linkedin: "https://linkedin.com/in/amrutabojedla/?skipRedirect=true",
    bio: [
      "Studied Electrical Engineering at OsloMet and Business Administration at NTNU, with experience spanning marketing, social media, and business development.",
      "Passionate about building connections and leveraging innovative solutions to create meaningful opportunities.",
    ],
  },
  {
    name: "Stian Pettersen",
    role: "Co-founder & CFO",
    imageSrc: "/Partner-site/About-Us/CFO_Stian.jpg",
    imageAlt: "Stian Pettersen",
    linkedin: "https://www.linkedin.com/in/stianjpettersen/",
    bio: [
      "A Master of Science in Industrial Economics (INDØK) and former Data Engineering student at OsloMet with a passion for creating innovative solutions through technology.",
      "With experience across diverse industries, skills in Java and database systems are paired with strong problem-solving and communication abilities. Committed to driving progress and fostering a positive, collaborative environment.",
    ],
  },
  {
    name: "Elisabeth Mathisen",
    role: "Head of Marketing at Oslo Student Hub",
    imageSrc: "/Partner-site/About-Us/Elisabeth.jpg",
    imageAlt: "Elisabeth Mathisen",
    linkedin: "https://www.linkedin.com/in/elisabeth-mathisen/",
    bio: [
      "Final-year Information Technology student at OsloMet, bringing together diverse experiences that provide a unique perspective and strong vision in the role.",
      "Engaged, creative, and detail-oriented, with a passion for transforming ideas into impactful initiatives. Dedicated to driving growth, fostering connections, and shaping innovative strategies that make a lasting difference.",
    ],
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <HeroSection
        title="About us"
        subtitle="Oslo Student Hub is powered by a diverse group with expertise in technology, business, and communication. Together, we are dedicated to bridging the gap between academia and the professional world, creating opportunities, and fostering innovation."
        backgroundImageSrc={SITE_IMAGES.homeHero.src}
        backgroundImageAlt={SITE_IMAGES.homeHero.alt}
        backgroundImagePosition="center"
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
          <div className="relative aspect-[16/11] overflow-hidden rounded-[30px] bg-primary shadow-[0_24px_70px_rgba(20,2,73,0.16)] ring-1 ring-primary/6">
            <Image
              src={SITE_IMAGES.studentsSupport.src}
              alt={SITE_IMAGES.studentsSupport.alt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 48vw"
            />
          </div>
        </div>
      </SectionWrapper>

      {/* ── Team ─────────────────────────────────────────────── */}
      <SectionWrapper bg="mist">
        <h2 className="mb-8 text-center text-2xl font-bold text-primary">
          Our Team
        </h2>
        <div className="grid gap-6 lg:grid-cols-3">
          {TEAM_MEMBERS.map((member) => (
            <div
              key={member.name}
              className="overflow-hidden rounded-[28px] bg-surface shadow-soft ring-1 ring-primary/5"
            >
              <div className="relative aspect-[4/4.2] bg-primary/5">
                <Image
                  src={member.imageSrc}
                  alt={member.imageAlt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 33vw"
                />
              </div>
              <div className="grid gap-4 p-6">
                <div>
                  <h3 className="text-xl font-bold text-primary">{member.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-secondary">
                    {member.role}
                  </p>
                </div>
                <div className="grid gap-3 text-sm leading-relaxed text-ink/72">
                  {member.bio.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                <Link
                  href={member.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-secondary"
                >
                  <Linkedin size={16} />
                  LinkedIn
                </Link>
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>

      <CtaSection
        headline="Want to join our mission?"
        ctaLabel="Contact us"
        ctaHref="/contact"
      />
    </>
  );
}
