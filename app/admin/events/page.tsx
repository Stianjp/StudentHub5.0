import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";

export const dynamic = "force-dynamic";

export default async function AdminEventsLandingPage() {
  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Events"
        title="Eventadmin"
        description="Velg oppgave for eventhåndtering."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <h3 className="text-lg font-bold text-primary">Registrer nytt event</h3>
          <p className="text-sm text-ink/70">Opprett nytt event med dato, sted og beskrivelse.</p>
          <Link className="button-link text-xs" href="/admin/events/new">
            Åpne
          </Link>
        </Card>
        <Card className="flex flex-col gap-3">
          <h3 className="text-lg font-bold text-primary">Oversikt over eventer</h3>
          <p className="text-sm text-ink/70">Se alle events og gå til detaljer.</p>
          <Link className="button-link text-xs" href="/admin/events/overview">
            Åpne
          </Link>
        </Card>
      </div>
    </div>
  );
}
