import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { getEvent, getEventCompanies } from "@/lib/events";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser } from "@/lib/student";
import { registerAttendeeForEvent, registerStudentForEvent } from "@/app/event/actions";
import { Input } from "@/components/ui/input";
import { CompanyInterestSelector } from "@/components/event/company-interest-selector";

type EventPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventPage({ params }: EventPageProps) {
  const { eventId } = await params;
  const supabase = await createServerSupabaseClient();
  const [
    event,
    registrations,
    {
      data: { user },
    },
  ] = await Promise.all([getEvent(eventId), getEventCompanies(eventId), supabase.auth.getUser()]);

  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  const student =
    user && profile?.role === "student" ? await getOrCreateStudentForUser(user.id, user.email) : null;

  const { data: tickets } = student
    ? await supabase.from("event_tickets").select("id, event_id").eq("student_id", student.id ?? "")
    : { data: [] };
  const registeredEventIds = new Set((tickets ?? []).map((ticket) => ticket.event_id));
  const companyOptions = registrations.map((registration) => ({
    id: registration.company_id,
    name: registration.company.name,
  }));

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
          <span className="font-semibold text-primary">Tid:</span>{" "}
          {new Date(event.starts_at).toLocaleString("nb-NO")} –{" "}
          {new Date(event.ends_at).toLocaleString("nb-NO")}
        </p>
        <p className="text-xs text-ink/60">Stand-QR: /events/{eventId}/companies/{"{companyId}"}/register</p>
      </Card>

      <section className="grid gap-4">
        <h2 className="text-lg font-bold text-primary">Hent billett</h2>
        <Card className="flex flex-col gap-4">
          {student ? (
            <form action={registerStudentForEvent} className="grid gap-3">
              <input type="hidden" name="eventId" value={eventId} />
              <label className="text-sm font-semibold text-primary">
                Telefon
                <Input name="phone" required placeholder="Telefonnummer" defaultValue={student.phone ?? ""} />
              </label>
              <div>
                <p className="text-sm font-semibold text-primary">Hvilke bedrifter er du interessert i?</p>
                <p className="text-xs text-ink/60">Velg alle, noen eller ingen.</p>
                <div className="mt-2">
                  <CompanyInterestSelector companies={companyOptions} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-secondary px-4 py-2 text-xs font-semibold text-primary transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={registeredEventIds.has(eventId)}
                >
                  {registeredEventIds.has(eventId) ? "Allerede påmeldt" : "Meld deg på som student"}
                </button>
                <p className="text-xs text-ink/60">
                  Du får billetten sendt på e-post med QR-kode.
                </p>
              </div>
            </form>
          ) : null}

          <form action={registerAttendeeForEvent} className="grid gap-3 md:grid-cols-3">
            <input type="hidden" name="eventId" value={eventId} />
            <label className="text-sm font-semibold text-primary md:col-span-1">
              Navn
              <input
                name="fullName"
                required
                className="mt-1 w-full rounded-xl border border-primary/20 bg-surface px-3 py-2 text-sm"
                placeholder="Fornavn Etternavn"
              />
            </label>
            <label className="text-sm font-semibold text-primary md:col-span-1">
              E-post
              <input
                name="email"
                type="email"
                required
                className="mt-1 w-full rounded-xl border border-primary/20 bg-surface px-3 py-2 text-sm"
                placeholder="navn@epost.no"
              />
            </label>
            <label className="text-sm font-semibold text-primary md:col-span-1">
              Telefon
              <input
                name="phone"
                required
                className="mt-1 w-full rounded-xl border border-primary/20 bg-surface px-3 py-2 text-sm"
                placeholder="Telefonnummer"
              />
            </label>
            <button
              type="submit"
              className="md:col-span-3 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-surface transition hover:bg-primary/90"
            >
              Hent billett
            </button>
          </form>
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
              <Link
                key={registration.id}
                href={`/event/events/${eventId}/companies/${registration.company_id}/register`}
              >
                <Card className="flex flex-col gap-2 transition hover:-translate-y-0.5">
                  <p className="text-sm font-semibold text-primary">{registration.company.name}</p>
                  <p className="text-xs text-ink/70">{registration.company.industry ?? "Bransje ikke satt"}</p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
