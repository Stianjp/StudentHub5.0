import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { CheckinRegistrationEmbed } from "@/components/event/checkin-registration-embed";

const CHECKIN_EVENT_ID = 228140;

export default async function StudentEventsPage() {
  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Student"
        title="Hent gratis billett"
        description="Logg inn og bruk skjemaet under for å hente ut billetten din. Har du allerede en konto, kan du gå direkte til profilen din og fortsette derfra."
        actions={
          <Link className="button-link text-xs" href="/student/dashboard">
            Tilbake til oversikt
          </Link>
        }
      />

      <Card className="-mx-2 grid min-w-0 gap-6 overflow-hidden border border-secondary/20 bg-[linear-gradient(135deg,#FFF8EF_0%,#FFFFFF_48%,#FFF4F8_100%)] p-3 text-[#140249] sm:mx-0 sm:p-6 xl:grid-cols-[0.85fr_1.15fr] xl:items-start">
        <div className="grid min-w-0 gap-3 text-[#140249]">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#FE9A70]">Slik fungerer det</p>
          <h2 className="text-2xl font-bold text-[#140249]">Logg inn, fyll ut skjemaet, og hent billetten.</h2>
          <p className="text-sm leading-relaxed text-[#140249]/80">
            Dette er den nye billettløsningen for studenter. Du registrerer deg i embed-skjemaet, og
            deretter kan vi bruke informasjonen til oppfølging og leads der det er relevant.
          </p>
          <div className="rounded-2xl bg-white/80 p-4 text-sm text-[#140249] ring-1 ring-primary/8">
            <p className="font-semibold text-[#140249]">Har du konto fra før?</p>
            <p className="mt-1 text-[#140249]/80">
              Logg inn og gå videre til profilen din. Skjemaet er bygget for mobil, nettbrett og desktop.
            </p>
          </div>
        </div>

        <CheckinRegistrationEmbed
          eventId={CHECKIN_EVENT_ID}
          title="Gratis studentbillett"
          description="Fyll inn opplysningene dine under. Når skjemaet er sendt inn, kan billetten hentes og informasjonen kobles til studentprofilen."
        />
      </Card>
    </div>
  );
}
