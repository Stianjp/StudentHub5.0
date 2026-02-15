import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { requireRole } from "@/lib/auth";
import { listActiveEvents } from "@/lib/events";
import { getOrCreateStudentForUser } from "@/lib/student";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type StudentTicket = {
  id: string;
  event_id: string;
  ticket_number: string;
  checked_in_at: string | null;
  status: string;
};

export default async function StudentEventsPage() {
  const profile = await requireRole("student");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");

  const student = await getOrCreateStudentForUser(profile.id, user.email);
  const [events, { data: ticketRows }] = await Promise.all([
    listActiveEvents(),
    supabase
      .from("event_tickets")
      .select("id, event_id, ticket_number, checked_in_at, status")
      .eq("student_id", student.id),
  ]);

  const ticketByEvent = new Map(
    ((ticketRows ?? []) as StudentTicket[]).map((ticket) => [ticket.event_id, ticket]),
  );

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Student"
        title="Påmelding til event"
        description="Du kan ha en billett per event. Du kan være påmeldt flere ulike event samtidig."
      />

      {events.length === 0 ? (
        <Card>
          <p className="text-sm text-ink/70">Ingen aktive events tilgjengelig.</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {events.map((event) => {
            const ticket = ticketByEvent.get(event.id);
            return (
              <Card key={event.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-primary">{event.name}</p>
                    <p className="text-xs text-ink/70">
                      {new Date(event.starts_at).toLocaleString("nb-NO")} -{" "}
                      {new Date(event.ends_at).toLocaleString("nb-NO")}
                    </p>
                  </div>
                  {ticket ? (
                    <Badge variant={ticket.checked_in_at ? "success" : "info"}>
                      {ticket.checked_in_at ? "Sjekket inn" : "Har billett"}
                    </Badge>
                  ) : null}
                </div>

                {ticket ? (
                  <div className="rounded-xl border border-success/20 bg-success/10 px-3 py-2 text-xs text-success">
                    Billett: <span className="font-semibold">{ticket.ticket_number}</span>
                    {ticket.checked_in_at ? (
                      <span> - Innsjekket {new Date(ticket.checked_in_at).toLocaleString("nb-NO")}</span>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs text-ink/70">Ingen billett registrert ennå.</p>
                )}

                <Link className="button-link text-xs" href={`/student/events/${event.id}`}>
                  {ticket ? "Se billett" : "Åpen påmelding"}
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
