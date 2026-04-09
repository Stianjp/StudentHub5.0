import type { Metadata } from "next";
import { Mail, MapPin, Send } from "lucide-react";
import { HeroSection } from "@/components/hovedside/hero-section";
import { SectionWrapper } from "@/components/hovedside/section-wrapper";

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
                    href="mailto:kontakt@oslostudenthub.no"
                    className="text-sm text-ink/70 hover:text-secondary"
                  >
                    kontakt@oslostudenthub.no
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

          {/* Contact form placeholder */}
          <div className="rounded-2xl bg-mist/40 p-8 ring-1 ring-primary/5">
            <h3 className="mb-6 text-lg font-bold text-primary">
              Send us a message
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink/60">
                  Name
                </label>
                <input
                  type="text"
                  disabled
                  placeholder="Your name"
                  className="w-full rounded-xl border border-primary/10 bg-surface px-4 py-2.5 text-sm text-ink/80 placeholder:text-ink/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink/60">
                  Email
                </label>
                <input
                  type="email"
                  disabled
                  placeholder="your@email.com"
                  className="w-full rounded-xl border border-primary/10 bg-surface px-4 py-2.5 text-sm text-ink/80 placeholder:text-ink/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink/60">
                  Message
                </label>
                <textarea
                  disabled
                  rows={4}
                  placeholder="Your message..."
                  className="w-full rounded-xl border border-primary/10 bg-surface px-4 py-2.5 text-sm text-ink/80 placeholder:text-ink/30"
                />
              </div>
              <button
                disabled
                className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-surface opacity-50"
              >
                <Send size={14} />
                Send Message
              </button>
              <p className="text-xs text-ink/40">
                Skjemaet er en placeholder og ikke koblet til backend enda.
              </p>
            </div>
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
