import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CheckinHomePage() {
  const supabase = await createServerSupabaseClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, name, starts_at, ends_at")
    .order("starts_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        eyebrow="Check-in"
        title="Velg arrangement"
        description="Velg eventet dere skal sjekke inn til."
      />
      <Card className="flex flex-col gap-3">
        {(events ?? []).length === 0 ? (
          <p className="text-sm text-ink/70">Ingen events tilgjengelig.</p>
        ) : (
          <ul className="grid gap-2 text-sm text-ink/80">
            {events?.map((event) => (
              <li key={event.id} className="flex items-center justify-between rounded-xl bg-primary/5 px-3 py-2">
                <div>
                  <p className="font-semibold text-primary">{event.name}</p>
                  <p className="text-xs text-ink/60">
                    {new Date(event.starts_at).toLocaleString("nb-NO")} – {new Date(event.ends_at).toLocaleString("nb-NO")}
                  </p>
                </div>
                <Link className="button-link text-xs" href={`/checkin/${event.id}`}>
                  Åpne
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
