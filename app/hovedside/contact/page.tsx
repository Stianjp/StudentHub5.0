import type { Metadata } from "next";
import { Mail, MapPin } from "lucide-react";
import { ContactForm } from "@/components/hovedside/contact-form";
import { HeroSection } from "@/components/hovedside/hero-section";
import { SectionWrapper } from "@/components/hovedside/section-wrapper";
import { SITE_IMAGES } from "@/lib/hovedside/site-images";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Oslo Student Hub.",
};

export default function ContactPage() {
  return (
    <>
      <HeroSection
        title="Contact Us"
        subtitle="Have questions or want to collaborate? We'd love to hear from you."
        backgroundImageSrc={SITE_IMAGES.partnersHero.src}
        backgroundImageAlt={SITE_IMAGES.partnersHero.alt}
        backgroundImagePosition="center"
      />

      <div className="h-2 bg-gradient-to-r from-secondary via-pink to-purple" />

      <SectionWrapper>
        <div className="grid gap-10 md:grid-cols-2">
          {/* Contact info */}
          <div>
            <h2 className="text-2xl font-bold text-primary">Get in Touch</h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/70">
              Whether you&apos;re a student, a company, or just curious about
              what we do, don&apos;t hesitate to reach out.
            </p>

            <div className="mt-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple/10 text-purple">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary">Email</p>
                  <a
                    href="mailto:support@oslostudenthub.no"
                    className="text-sm text-ink/70 hover:text-secondary"
                  >
                    support@oslostudenthub.no
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple/10 text-purple">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary">Location</p>
                  <p className="text-sm text-ink/70">Oslo, Norway</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-mist/40 p-8 ring-1 ring-primary/5">
            <h3 className="mb-6 text-lg font-bold text-primary">
              Send us a message
            </h3>
            <ContactForm />
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
