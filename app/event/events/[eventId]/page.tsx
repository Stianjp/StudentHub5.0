import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { getEvent, getEventCompanies } from "@/lib/events";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser } from "@/lib/student";

type EventPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default async function EventPage({ params, searchParams }: EventPageProps) {
  const { eventId } = await params;
  const ticketSent = searchParams?.ticket === "sent";
  const ticketExists = searchParams?.ticket === "exists";
  const supabase = await createServerSupabaseClient();
  const [
    event,
    registrations,
    {
      data: { user },
    },
  ] = await Promise.all([getEvent(eventId), getEventCompanies(eventId), supabase.auth.getUser()]);

  const { data: profile } = user
    ? await supabase.from("profiles").select("id, role").eq("id" as never, user.id as never).maybeSingle()
    : { data: null };
  const typedProfile = profile as { role?: string } | null;

  const student =
    user && typedProfile?.role === "student" ? await getOrCreateStudentForUser(user.id, user.email) : null;

  const { data: tickets } = student
    ? await supabase.from("event_tickets").select("id, event_id, student_id").eq("student_id", student.id ?? "")
    : { data: [] };
  const typedTickets = (tickets ?? []) as Array<{ id: string; event_id: string; student_id: string | null }>;
  const registeredEventIds = new Set(typedTickets.map((ticket) => ticket.event_id));
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
              href="#bedrifter"
            >
              Bedrifter
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
        <h2 className="text-lg font-bold text-primary">Hent din gratis student billett her</h2>
        {ticketSent ? (
          <Card className="border border-secondary/40 bg-secondary/15 text-sm font-semibold text-primary" role="status">
            Billett sendt til din e-post. Sjekk også søppelpost.
          </Card>
        ) : null}
        {ticketExists ? (
          <Card className="border border-info/40 bg-info/10 text-sm font-semibold text-info" role="status">
            Du har allerede billett til dette eventet.
          </Card>
        ) : null}
        <Card className="grid gap-4 border border-secondary/20 bg-[linear-gradient(135deg,#FFF7EE_0%,#FFFFFF_45%,#FFF0F1_100%)]">
          <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div className="grid gap-2">
              <p className="text-sm text-ink/75">
                Vi har laget en egen registreringsside for studenter, slik at dere kan fylle ut hele studentprofilen og velge om dere vil opprette bruker samtidig.
              </p>
              <p className="text-sm text-ink/75">
                Dette gjør registreringen mer brukervennlig og gir dere raskere tilgang til billett, matching og videre oppfølging.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-bold tracking-wide transition ${
                  registeredEventIds.has(eventId)
                    ? "cursor-not-allowed bg-primary/15 text-primary/60"
                    : "bg-primary text-surface shadow-soft hover:-translate-y-0.5 hover:bg-primary/90"
                }`}
                href={registeredEventIds.has(eventId) ? "#" : `/event/events/${eventId}/ticket`}
                aria-disabled={registeredEventIds.has(eventId)}
                tabIndex={registeredEventIds.has(eventId) ? -1 : undefined}
              >
                {registeredEventIds.has(eventId) ? "Allerede påmeldt" : "Hent din gratis student billett her"}
              </Link>
              <p className="text-xs text-ink/60">
                Konto er valgfritt, men anbefalt hvis du vil logge inn på studentsiden etterpå.
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
