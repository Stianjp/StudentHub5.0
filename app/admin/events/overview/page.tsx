import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { listEventsWithStats } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminEventsOverviewPage() {
  const events = await listEventsWithStats();

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Events"
        title="Oversikt over eventer"
        description="Liste over registrerte events."
        actions={<Link className="button-link text-xs" href="/admin/events/new">Registrer nytt event</Link>}
      />

      <section className="grid gap-4">
        {events.length === 0 ? (
          <Card>
            <p className="text-sm text-ink/70">Ingen events opprettet ennå.</p>
          </Card>
        ) : (
          events.map((event) => (
            <Card key={event.id} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <Link href={`/admin/events/${event.id}`} className="text-lg font-bold text-primary hover:underline">
                    {event.name}
                  </Link>
                  <p className="text-xs text-ink/70">/{event.slug}</p>
                </div>
                <div className="text-xs font-semibold text-primary/70">
                  {event.companyCount} bedrifter · {event.visitCount} besøk · {event.leadCount} leads
                </div>
              </div>
              <div className="text-xs text-ink/70">
                {new Date(event.starts_at).toLocaleDateString("nb-NO")}
              </div>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
