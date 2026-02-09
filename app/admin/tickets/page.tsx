import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { deleteTicket, resendTicketEmail } from "@/app/admin/actions";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function AdminTicketsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const eventId = typeof params.eventId === "string" ? params.eventId : "";
  const errorMessage = typeof params.error === "string" ? params.error : "";
  const saved = params.saved === "1";

  const supabase = createAdminSupabaseClient();
  const { data: events } = await supabase.from("events").select("id, name").order("starts_at", { ascending: false });

  const { data: tickets } = eventId
    ? await supabase
        .from("event_tickets")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
    : { data: [] };

  const studentIds = (tickets ?? []).map((ticket) => ticket.student_id).filter(Boolean) as string[];
  const { data: students } = studentIds.length
    ? await supabase
        .from("students")
        .select("id, full_name, email, phone, study_program, study_level, study_year")
        .in("id", studentIds)
    : { data: [] };
  const studentMap = new Map((students ?? []).map((student) => [student.id, student]));

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Billetter"
        title="Billettoversikt"
        description="Se alle påmeldte og send billetter på nytt."
        actions={
          eventId ? (
            <Link
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-surface"
              href={`/api/admin/tickets/export?eventId=${eventId}`}
            >
              Eksporter CSV
            </Link>
          ) : null
        }
      />

      {saved ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">
          E-post sendt.
        </Card>
      ) : null}
      {errorMessage ? (
        <Card className="border border-error/30 bg-error/10 text-sm text-error">
          {decodeURIComponent(errorMessage)}
        </Card>
      ) : null}

      <Card className="flex flex-col gap-4">
        <form className="grid gap-3 md:grid-cols-3">
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Velg event
            <Select name="eventId" defaultValue={eventId}>
              <option value="">Velg</option>
              {(events ?? []).map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </Select>
          </label>
          <Button type="submit" variant="secondary" className="self-end">
            Vis
          </Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Påmeldte</h3>
        {(tickets ?? []).length === 0 ? (
          <p className="text-sm text-ink/70">Ingen billetter funnet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-primary/10 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-primary/60">
                  <th className="px-3 py-2">Navn</th>
                  <th className="px-3 py-2">E-post</th>
                  <th className="px-3 py-2">Telefon</th>
                  <th className="px-3 py-2">Studie</th>
                  <th className="px-3 py-2">Billett</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Handling</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {(tickets ?? []).map((ticket) => {
                  const student = ticket.student_id ? studentMap.get(ticket.student_id) : null;
                  const name = student?.full_name ?? ticket.attendee_name ?? "—";
                  const email = student?.email ?? ticket.attendee_email ?? "—";
                  const phone = student?.phone ?? ticket.attendee_phone ?? "—";
                  const study = student?.study_program ?? "—";
                  const level = student?.study_level ?? "";
                  const year = student?.study_year ? `${student.study_year}. år` : "";

                  return (
                    <tr key={ticket.id}>
                      <td className="px-3 py-3 font-semibold text-primary">{name}</td>
                      <td className="px-3 py-3 text-ink/80">{email}</td>
                      <td className="px-3 py-3 text-ink/80">{phone}</td>
                      <td className="px-3 py-3 text-ink/80">
                        {study}
                        <div className="text-xs text-ink/60">{[year, level].filter(Boolean).join(" ")}</div>
                      </td>
                      <td className="px-3 py-3 text-ink/80">{ticket.ticket_number}</td>
                      <td className="px-3 py-3 text-ink/80">
                        {ticket.status}
                        {ticket.checked_in_at ? (
                          <div className="text-xs text-ink/60">{new Date(ticket.checked_in_at).toLocaleString("nb-NO")}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <form action={resendTicketEmail}>
                            <input type="hidden" name="ticketId" value={ticket.id} />
                            <input type="hidden" name="returnTo" value={`/admin/tickets?eventId=${eventId}`} />
                            <Button type="submit" variant="secondary">
                              Send på nytt
                            </Button>
                          </form>
                          <form action={deleteTicket}>
                            <input type="hidden" name="ticketId" value={ticket.id} />
                            <input type="hidden" name="returnTo" value={`/admin/tickets?eventId=${eventId}`} />
                            <Button type="submit" variant="secondary">
                              Slett
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
