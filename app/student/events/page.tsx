import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { listActiveEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function StudentEventsPage() {
  const events = await listActiveEvents();

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Student"
        title="Påmelding til event"
        description="Velg et event for å melde deg på."
      />

      {events.length === 0 ? (
        <Card>
          <p className="text-sm text-ink/70">Ingen aktive events tilgjengelig.</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {events.map((event) => (
            <Card key={event.id} className="flex flex-col gap-2">
              <div>
                <p className="text-lg font-bold text-primary">{event.name}</p>
                <p className="text-xs text-ink/70">
                  {new Date(event.starts_at).toLocaleString("nb-NO")} – {new Date(event.ends_at).toLocaleString("nb-NO")}
                </p>
              </div>
              <Link className="button-link text-xs" href={`/student/events/${event.id}`}>
                Åpne påmelding
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
