import type { Metadata } from "next";
import Link from "next/link";
import { SectionWrapper } from "@/components/hovedside/section-wrapper";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Oslo Student Hub processes personal data in our portals.",
};

export default function PrivacyPage() {
  return (
    <SectionWrapper className="py-16 sm:py-24">
      <article className="mx-auto max-w-3xl text-ink/80">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Privacy</p>
        <h1 className="mt-3 text-4xl font-bold text-primary">Privacy policy</h1>
        <p className="mt-4 text-sm text-ink/60">Last updated 22 September 2026</p>

        <div className="mt-10 space-y-8 leading-7">
          <section>
            <h2 className="text-2xl font-bold text-primary">Who processes your data?</h2>
            <p className="mt-3">Oslo Student Hub processes the personal data needed to provide our student and company portals. You can send questions to <a className="font-semibold text-primary underline" href="mailto:support@oslostudenthub.no">support@oslostudenthub.no</a>.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-primary">Data we use</h2>
            <p className="mt-3">When you sign in with Google, we receive your name, email address and the basic profile information you have authorised Google to share. Students can also add their education, interests and job preferences. Company users can add company details and contact information.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-primary">How we use and store your data</h2>
            <p className="mt-3">We use this data for sign-in, access management, relevant student–company matches, events and portal administration. Account and portal data is stored in Supabase. The website is hosted on Vercel. We do not request access to Gmail, Drive, Calendar or other Google services.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-primary">Sharing and deletion</h2>
            <p className="mt-3">We only share data with companies as part of a feature you use or based on consent you have given. You can request access to, correction of or deletion of your data by contacting us. You can also remove access granted to Oslo Student Hub in your Google account security settings.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-primary">Contact</h2>
            <p className="mt-3">Contact us at <a className="font-semibold text-primary underline" href="mailto:support@oslostudenthub.no">support@oslostudenthub.no</a> if you have questions about privacy or would like to exercise your rights.</p>
            <p className="mt-3"><Link href="/contact" className="font-semibold text-primary underline">Go to the contact page</Link></p>
          </section>
        </div>
      </article>
    </SectionWrapper>
  );
}
