import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { getEvent, getEventCompanies } from "@/lib/events";

type EventPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventPage({ params }: EventPageProps) {
  const { eventId } = await params;
  const [event, registrations] = await Promise.all([getEvent(eventId), getEventCompanies(eventId)]);
  const eventTime = `${new Date(event.starts_at).toLocaleString("nb-NO")} - ${new Date(event.ends_at).toLocaleString("nb-NO")}`;

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Event"
        title={event.name}
        description={event.description ?? "Eventinformasjon"}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-primary"
              href={`/event/events/${eventId}/kiosk`}
            >
              Kiosk
            </Link>
            <Link
              className="rounded-xl border border-primary/20 px-4 py-2 text-sm font-semibold text-primary"
              href={`/event/events/${eventId}/ticket`}
            >
              Hent billett
            </Link>
          </div>
        }
      />

      <Card className="flex flex-col gap-2 text-sm text-ink/80">
        <p>
          <span className="font-semibold text-primary">Sted:</span> {event.location ?? "Kommer"}
        </p>
        <p>
          <span className="font-semibold text-primary">Tid:</span> {eventTime}
        </p>
      </Card>

      <section className="grid gap-4">
        <h2 className="text-lg font-bold text-primary">Hent gratis studentbillett</h2>
        <Card className="grid gap-4 border border-secondary/20 bg-[linear-gradient(135deg,#FFF7EE_0%,#FFFFFF_45%,#FFF0F1_100%)]">
          <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div className="grid gap-2">
              <p className="text-sm text-ink/75">
                Billettregistreringen er flyttet til studentportalen og bruker nå en tredjeparts embed-løsning.
              </p>
              <p className="text-sm text-ink/75">
                Hvis du allerede har en konto, logger du inn og går videre til profilen din for å hente billetten.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-bold tracking-wide text-surface transition hover:bg-primary/90"
                href="/auth/sign-in?role=student&next=%2Fstudent%2Fevents"
              >
                Logg inn og hent billett
              </Link>
              <p className="text-xs text-ink/60">
                Etter innlogging åpnes studentportalen med registreringsskjemaet.
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section id="bedrifter" className="grid gap-4">
        <h2 className="text-lg font-bold text-primary">Bedrifter som deltar</h2>
        {registrations.length === 0 ? (
          <Card>
            <p className="text-sm text-ink/80">Ingen bedrifter registrert enda.</p>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {registrations.map((registration) => (
              <Link key={registration.id} href={`/event/events/${eventId}/companies/${registration.company_id}/register`}>
                <Card className="flex flex-col gap-2 transition hover:-translate-y-0.5">
                  <p className="text-sm font-semibold text-primary">{registration.company.name}</p>
                  <p className="text-xs text-ink/70">
                    {registration.company.recruitment_fields?.length
                      ? registration.company.recruitment_fields.join(", ")
                      : registration.company.industry ?? "Bransje ikke satt"}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
