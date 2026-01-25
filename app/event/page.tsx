import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { listActiveEvents } from "@/lib/events";

export default async function EventIndexPage() {
  const events = await listActiveEvents();

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="ConnectHub"
        title="Aktive events"
        description="Event-sider, QR per stand og kioskmodus for rask datainnsamling."
      />

      {events.length === 0 ? (
        <Card>
          <p className="text-sm text-ink/80">Ingen aktive events akkurat nå.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <Link key={event.id} href={`/event/${event.id}`}>
              <Card className="flex h-full flex-col gap-3 transition hover:-translate-y-0.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Event</p>
                <h3 className="text-xl font-bold text-primary">{event.name}</h3>
                <p className="text-sm text-ink/80">{event.description ?? "Beskrivelse kommer."}</p>
                <div className="mt-auto text-xs font-semibold text-primary/70">
                  {new Date(event.starts_at).toLocaleString("nb-NO")}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
