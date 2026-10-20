import { osloDateTimeLocal, campaignStatus } from "@/lib/event-dates";
import Link from "next/link";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { saveEventPublication } from "@/app/admin/event-management-actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { TableRow } from "@/lib/types/database";
export async function EventPublication({
  event,
}: {
  event: TableRow<"events">;
}) {
  const { data: campaigns, error } = await createAdminSupabaseClient()
    .from("event_registration_campaigns")
    .select("*")
    .eq("event_id", event.id)
    .order("created_at");
  if (error) throw error;
  const rows: (TableRow<"event_registration_campaigns"> | null)[] =
    campaigns?.length ? campaigns : [null];
  return (
    <Card className="grid gap-4">
      <h2 className="text-2xl font-bold">Publisering</h2>
      <p>
        Nettsiden:{" "}
        {event.is_active && event.website_published ? "Publisert" : "Skjult"}.
        Avpublisering skjuler eventet og stenger alle påmeldingskampanjer.
      </p>
      <nav aria-label="Eventadministrasjon" className="flex flex-wrap gap-4">
        <Link
          className="underline"
          href={`/admin/event-catalog?eventId=${event.id}`}
        >
          Pakker og tillegg
        </Link>
        <Link
          className="underline"
          href={`/admin/events/${event.id}/placement`}
        >
          Områder og plassering
        </Link>
        <a className="underline" href="https://www.oslostudenthub.no/events">
          Åpne nettsiden
        </a>
      </nav>
      {rows.map((c) => (
        <form
          key={c?.id ?? "new"}
          action={saveEventPublication}
          className="grid gap-3 rounded-xl border border-primary/20 p-4"
        >
          <input type="hidden" name="eventId" value={event.id} />
          <input type="hidden" name="campaignId" value={c?.id ?? ""} />
          <h3 className="font-bold">
            {c?.public_title ?? "Bedriftspåmelding — opprett utkast"}
          </h3>
          {c ? (
            <p>
              Status: {campaignStatus(event.is_active, c)}.{" "}
              <a
                className="underline"
                href={`https://eventregister.oslostudenthub.no/${c.slug}`}
              >
                Åpne påmeldingssiden
              </a>
            </p>
          ) : (
            <p>
              Lagre for å opprette en kampanje som utkast. Sett deretter opp
              pakker og åpne påmeldingen.
            </p>
          )}
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              name="website"
              defaultChecked={Boolean(
                event.is_active && event.website_published,
              )}
            />
            Vis på nettsiden
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              name="registration"
              defaultChecked={Boolean(event.is_active && c?.is_published)}
            />
            Åpne bedriftspåmelding
          </label>
          <label>
            Åpner (valgfritt, Oslo-tid)
            <Input
              name="opensAt"
              type="datetime-local"
              defaultValue={osloDateTimeLocal(c?.opens_at)}
            />
          </label>
          <p className="text-sm">Tom åpningstid betyr umiddelbar åpning.</p>
          <label>
            Lukker (valgfritt, Oslo-tid)
            <Input
              name="closesAt"
              type="datetime-local"
              defaultValue={osloDateTimeLocal(c?.closes_at)}
            />
          </label>
          <Button type="submit">Lagre publisering</Button>
        </form>
      ))}
      <form action={saveEventPublication}>
        <input type="hidden" name="eventId" value={event.id} />
        <input type="hidden" name="intent" value="unpublish" />
        <Button variant="secondary" type="submit">
          Avpubliser event
        </Button>
      </form>
    </Card>
  );
}
