import type { Metadata } from "next";
import Link from "next/link";
import { SectionWrapper } from "@/components/hovedside/section-wrapper";

export const metadata: Metadata = {
  title: "Personvern",
  description: "Slik behandler Oslo Student Hub personopplysninger i portalene våre.",
};

export default function PrivacyPage() {
  return (
    <SectionWrapper className="py-16 sm:py-24">
      <article className="mx-auto max-w-3xl text-ink/80">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-secondary">Personvern</p>
        <h1 className="mt-3 text-4xl font-bold text-primary">Personvernerklæring</h1>
        <p className="mt-4 text-sm text-ink/60">Sist oppdatert 22. september 2026</p>

        <div className="mt-10 space-y-8 leading-7">
          <section>
            <h2 className="text-2xl font-bold text-primary">Hvem behandler opplysningene?</h2>
            <p className="mt-3">Oslo Student Hub behandler personopplysninger som er nødvendige for å levere student- og bedriftsportalene. Spørsmål kan sendes til <a className="font-semibold text-primary underline" href="mailto:support@oslostudenthub.no">support@oslostudenthub.no</a>.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-primary">Opplysninger vi bruker</h2>
            <p className="mt-3">Når du logger inn med Google, mottar vi navn, e-postadresse og grunnleggende profilinformasjon som du har godkjent hos Google. Studenter kan i tillegg registrere utdanning, interesser og jobbpreferanser. Bedriftsbrukere kan registrere firma- og kontaktopplysninger.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-primary">Formål og lagring</h2>
            <p className="mt-3">Opplysningene brukes til innlogging, tilgangsstyring, relevante student–bedrift-matcher, arrangementer og administrasjon av portalen. Konto- og portaldata lagres i Supabase. Nettsiden driftes gjennom Vercel. Vi ber ikke Google om tilgang til Gmail, Drive, kalender eller andre Google-tjenester.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-primary">Deling og sletting</h2>
            <p className="mt-3">Vi deler bare opplysninger med bedrifter når det følger av funksjonen du bruker eller et samtykke du har gitt. Du kan be om innsyn, retting eller sletting ved å kontakte oss. Tilgang gitt til Oslo Student Hub kan også fjernes fra sikkerhetsinnstillingene i Google-kontoen din.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-primary">Kontakt</h2>
            <p className="mt-3">Kontakt oss på <a className="font-semibold text-primary underline" href="mailto:support@oslostudenthub.no">support@oslostudenthub.no</a> dersom du har spørsmål om personvern eller ønsker å bruke rettighetene dine.</p>
            <p className="mt-3"><Link href="/contact" className="font-semibold text-primary underline">Gå til kontaktsiden</Link></p>
          </section>
        </div>
      </article>
    </SectionWrapper>
  );
}
