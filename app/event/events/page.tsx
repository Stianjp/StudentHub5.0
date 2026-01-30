import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { listActiveEvents } from "@/lib/events";

export default async function EventListPage() {
  const events = await listActiveEvents();

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Aktive events"
        description="Velg event for å registrere studenter eller åpne kioskmodus."
      />
      {events.length === 0 ? (
        <Card>
          <p className="text-sm text-ink/80">Ingen aktive events akkurat nå.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <Link key={event.id} href={`/event/events/${event.id}`} className="group">
              <Card className="flex flex-col gap-2 transition group-hover:-translate-y-0.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Event</p>
                <h3 className="text-xl font-bold text-primary">{event.name}</h3>
                <p className="text-sm text-ink/80">{event.description ?? "Beskrivelse kommer."}</p>
                <p className="text-xs text-ink/60">
                  {new Date(event.starts_at).toLocaleString("nb-NO")}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
