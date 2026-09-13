import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { requireRole } from "@/lib/auth";
import { getEventWithRegistrations } from "@/lib/admin";
import { listAdminRegistrationCampaignsForEvent } from "@/lib/event-registration";
import { saveRegistrationCampaign } from "@/app/admin/event-registration-actions";

type PageProps = {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default async function AdminEventRegistrationPage({ params, searchParams }: PageProps) {
  await requireRole("admin");
  const { eventId } = await params;
  const search = (await (searchParams ?? Promise.resolve({}))) as Record<string, string | string[] | undefined>;
  const saved = search.saved === "1";
  const errorMessage = typeof search.error === "string" ? decodeURIComponent(search.error) : "";
  const eventData = await getEventWithRegistrations(eventId);
  const campaigns = await listAdminRegistrationCampaignsForEvent(eventId);
  const returnTo = `/admin/events/${eventId}/registration`;

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Registrering"
        title={`Offentlig bedriftsregistrering for ${eventData.event.name}`}
        description="Sett opp kampanjer som er synlige på eventregister.oslostudenthub.no og følg innsendte søknader."
        actions={
          <div className="flex items-center gap-3">
            <Link className="text-sm font-semibold text-primary/70 transition hover:text-primary" href={`/admin/events/${eventId}`}>
              Tilbake til event
            </Link>
            <a
              className="button-link text-xs"
              href={eventData.event.registration_form_url ?? `https://eventregister.oslostudenthub.no/${eventData.event.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              Åpne offentlig side
            </a>
          </div>
        }
      />

      {saved ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">Oppdatering lagret.</Card>
      ) : null}
      {errorMessage ? (
        <Card className="border border-error/30 bg-error/10 text-sm text-error">{errorMessage}</Card>
      ) : null}

      <Card className="grid gap-4">
        <div>
          <h3 className="text-lg font-bold text-primary">Ny registreringskampanje</h3>
          <p className="mt-1 text-sm text-ink/70">
            Knytt en offentlig registreringsflyt til eventet. Student Connect 2026 kan opprettes her første gang og deretter vedlikeholdes videre på detaljsiden.
          </p>
        </div>
        <form action={saveRegistrationCampaign} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="text-sm font-semibold text-primary">
            Slug
            <Input name="slug" required defaultValue={eventData.event.slug} />
          </label>
          <label className="text-sm font-semibold text-primary">
            Offentlig tittel
            <Input name="publicTitle" required defaultValue={eventData.event.name} />
          </label>
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Undertittel
            <Input name="publicSubtitle" defaultValue="Register your company for the fair and request portal access for your team." />
          </label>
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Beskrivelse
            <Textarea
              name="publicDescription"
              rows={4}
              defaultValue="Complete the registration to request a stand, package and company portal access. OSH will review and approve the application before access is granted."
            />
          </label>
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Floorplan image path
            <Input name="floorplanImagePath" defaultValue="/event-register/student-connect-2026-floorplan.svg" />
          </label>
          <label className="text-sm font-semibold text-primary">
            E-postgruppe-prefiks
            <Input name="emailGroupPrefix" defaultValue="SC26" placeholder="SC26" />
          </label>
          <label className="text-sm font-semibold text-primary">
            Åpner
            <Input name="opensAt" type="datetime-local" defaultValue={toDateTimeLocal(eventData.event.starts_at)} />
          </label>
          <label className="text-sm font-semibold text-primary">
            Lukker
            <Input name="closesAt" type="datetime-local" defaultValue={toDateTimeLocal(eventData.event.ends_at)} />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-primary md:col-span-2">
            <input type="checkbox" name="isPublished" defaultChecked className="h-4 w-4" />
            Publiser kampanjen umiddelbart
          </label>
          <Button type="submit" className="md:col-span-2">Opprett kampanje</Button>
        </form>
      </Card>

      <section className="grid gap-4">
        {campaigns.length === 0 ? (
          <Card>
            <p className="text-sm text-ink/70">Ingen registreringskampanjer er opprettet for dette eventet ennå.</p>
          </Card>
        ) : (
          campaigns.map((campaign) => (
            <Card key={campaign.id} className="grid gap-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/60">/{campaign.slug}</p>
                  <h3 className="mt-2 text-xl font-bold text-primary">{campaign.public_title}</h3>
                  <p className="mt-1 text-sm text-ink/70">{campaign.public_subtitle || "Ingen undertittel satt."}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                    {campaign.is_published ? "Publisert" : "Skjult"}
                  </span>
                  <span className="rounded-full bg-secondary/20 px-3 py-1 text-primary">
                    {campaign.pendingCount} venter
                  </span>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                    {campaign.applicationCount} søknader
                  </span>
                </div>
              </div>
              <div className="grid gap-2 text-sm text-ink/70 md:grid-cols-3">
                <p><span className="font-semibold text-primary">Åpner:</span> {campaign.opens_at ? new Date(campaign.opens_at).toLocaleString("nb-NO") : "Ikke satt"}</p>
                <p><span className="font-semibold text-primary">Lukker:</span> {campaign.closes_at ? new Date(campaign.closes_at).toLocaleString("nb-NO") : "Ikke satt"}</p>
                <p><span className="font-semibold text-primary">Offentlig URL:</span> https://eventregister.oslostudenthub.no/{campaign.slug}</p>
                <p><span className="font-semibold text-primary">E-postgruppe-prefiks:</span> {campaign.email_group_prefix || "Ikke satt"}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link className="button-link text-xs" href={`/admin/events/${eventId}/registration/${campaign.id}`}>
                  Administrer kampanje
                </Link>
                <a
                  className="text-xs font-semibold text-primary/70 transition hover:text-primary"
                  href={`https://eventregister.oslostudenthub.no/${campaign.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Åpne offentlig side
                </a>
              </div>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
