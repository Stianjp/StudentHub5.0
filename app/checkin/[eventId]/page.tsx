import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { getEvent } from "@/lib/events";
import { CheckinClient } from "./checkin-client";

type PageProps = {
  params: Promise<{ eventId: string }>;
};

export const revalidate = 300;

export default async function CheckinEventPage({ params }: PageProps) {
  const { eventId } = await params;
  const event = await getEvent(eventId).catch(() => null);

  if (!event) {
    return (
      <Card className="text-sm text-ink/70">
        Event ikke funnet. <Link className="text-primary/70 hover:text-primary" href="/checkin">Tilbake</Link>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        eyebrow="Check-in"
        title={event.name}
        description="Skann QR-koder eller søk etter deltakere."
        actions={<Link className="button-link text-xs" href="/checkin">Bytt event</Link>}
      />
      <CheckinClient eventId={eventId} />
    </div>
  );
}
