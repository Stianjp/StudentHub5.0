import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Stat } from "@/components/ui/stat";
import { listCompanyAccessRequests, listEventsWithStats } from "@/lib/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";
import { inviteAdmin } from "@/app/admin/admins/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function AdminOverviewPage() {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient();
  } catch {
    // fall back to session-based client
  }

  const [events, companiesCount, studentsCount, visitsCount, leadsCount, accessRequests, ticketCounts] = await Promise.all([
    listEventsWithStats(),
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("stand_visits").select("id", { count: "exact", head: true }),
    supabase.from("consents").select("id", { count: "exact", head: true }).eq("consent", true),
    listCompanyAccessRequests(),
    supabase.from("event_tickets").select("event_id"),
  ]);

  const ticketCountMap = new Map<string, number>();
  (ticketCounts.data ?? []).forEach((row: { event_id: string | null }) => {
    if (!row.event_id) return;
    ticketCountMap.set(row.event_id, (ticketCountMap.get(row.event_id) ?? 0) + 1);
  });

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Admin"
        title="OSH oversikt"
        description="Totalstatistikk og innganger til events, pakker og invitasjoner."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Bedrifter" value={companiesCount.count ?? 0} />
        <Stat label="Studenter" value={studentsCount.count ?? 0} />
        <Stat label="Standbesøk" value={visitsCount.count ?? 0} />
        <Stat label="Leads" value={leadsCount.count ?? 0} hint="Consent=true" />
      </div>
      <Card className="flex flex-col gap-2 text-sm text-ink/80">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Tilgangsforespørsler</p>
            <p className="text-lg font-bold text-primary">{accessRequests.length}</p>
          </div>
          <Link className="button-link text-xs" href="/admin/companies/register#tilgangsforesporsler">
            Se forespørsler
          </Link>
        </div>
        {accessRequests.length === 0 ? (
          <p className="text-xs text-ink/70">Ingen nye forespørsler akkurat nå.</p>
        ) : (
          <p className="text-xs text-ink/70">Du har {accessRequests.length} forespørsel(er) som venter.</p>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary">Events</h3>
          <Link className={cn("rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-primary")} href="/admin/events">
            Administrer events
          </Link>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen events opprettet ennå.</p>
        ) : (
          <ul className="grid gap-2 text-sm text-ink/80">
            {events.slice(0, 5).map((event) => (
              <li key={event.id} className="flex flex-col gap-1 rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-primary">{event.name}</p>
                  <p className="text-xs text-ink/70">{new Date(event.starts_at).toLocaleDateString("nb-NO")}</p>
                </div>
                <div className="flex gap-4 text-xs font-semibold text-primary/70">
                  <span>{event.companyCount} bedrifter</span>
                  <span>{event.visitCount} besøk</span>
                  <span>{event.leadCount} leads</span>
                  <span>
                    {ticketCountMap.get(event.id) ?? 0}/{event.ticket_limit ?? "∞"} billetter
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-2 text-sm text-ink/80">
        <p className="font-semibold text-primary">Tips for MVP</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Opprett minst ett admin-bruker i Supabase og sett{" "}
            <code className="rounded bg-primary/10 px-1 py-0.5 text-primary">profiles.role=&apos;admin&apos;</code>.
          </li>
          <li>Bruk seed.sql for demo-data, men knytt user_id til ekte brukere i dev.</li>
          <li>Pakker styres via event_companies.package (Standard/Sølv/Gull/Platinum).</li>
        </ul>
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Inviter ny admin</h3>
        <form action={inviteAdmin} className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="text-sm font-semibold text-primary md:flex-1">
            E-post
            <Input name="email" type="email" placeholder="admin@oslostudenthub.no" required />
          </label>
          <Button variant="secondary" type="submit">Send invitasjon</Button>
        </form>
        <p className="text-xs text-ink/70">Kun eksisterende admin kan invitere nye admin-brukere.</p>
      </Card>
    </div>
  );
}
