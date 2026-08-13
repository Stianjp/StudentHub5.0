import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { getEvent } from "@/lib/events";

const STUDENT_APP_URL =
  process.env.NEXT_PUBLIC_STUDENT_APP_URL?.trim() || "https://student.oslostudenthub.no";

type TicketPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventTicketPage({ params }: TicketPageProps) {
  const { eventId } = await params;
  const event = await getEvent(eventId);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Event"
        title={`Hent billett til ${event.name}`}
        description="Billetten hentes nå i studentportalen. Hvis du allerede har en konto, logger du inn og fortsetter der."
        actions={
          <Link
            className="rounded-xl border border-primary/20 px-4 py-2 text-sm font-semibold text-primary"
            href={`/event/events/${eventId}`}
          >
            Tilbake til eventet
          </Link>
        }
      />

      <Card className="grid gap-4 border border-secondary/20 bg-[linear-gradient(135deg,#FFF7EE_0%,#FFFFFF_50%,#FFF1F4_100%)] md:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-secondary">Ny flyt</p>
          <h2 className="text-2xl font-bold text-primary">Logg inn og gå til studentprofilen din</h2>
          <p className="text-sm leading-relaxed text-ink/75">
            Vi bruker nå en tredjeparts registrering for gratis billetter. Når du logger inn i studentportalen,
            kan du hente ut billetten og samtidig holde profilen din oppdatert.
          </p>
          <p className="text-sm leading-relaxed text-ink/75">
            Har du ikke konto fra før, registrerer du deg først og bruker deretter samme innlogging videre.
          </p>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-[24px] bg-white p-5 ring-1 ring-primary/8">
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-primary">Neste steg</p>
            <p className="text-sm leading-relaxed text-ink/70">
              Åpne studentportalen og fortsett til billettskjemaet der.
            </p>
          </div>
          <Link
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-bold text-surface transition hover:bg-primary/90"
            href={`${STUDENT_APP_URL}/auth/sign-in?role=student&next=%2Fstudent%2Fevents`}
          >
            Logg inn og hent billett
          </Link>
        </div>
      </Card>
    </div>
  );
}
