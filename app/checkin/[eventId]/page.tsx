import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CheckinClient } from "./checkin-client";

type PageProps = {
  params: Promise<{ eventId: string }>;
};

export const dynamic = "force-dynamic";

export default async function CheckinEventPage({ params }: PageProps) {
  const { eventId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: event } = await supabase.from("events").select("*").eq("id", eventId).single();

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
        actions={<Link className="text-sm font-semibold text-primary/70 hover:text-primary" href="/checkin">Bytt event</Link>}
      />
      <CheckinClient eventId={eventId} />
    </div>
  );
}
