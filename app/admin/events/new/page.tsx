import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { saveEvent } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminNewEventPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const saved = params.saved === "1";
  const errorMessage = typeof params.error === "string" ? params.error : "";

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Events"
        title="Registrer nytt event"
        description="Opprett et nytt event med dato, lokasjon og beskrivelse."
      />

      {saved ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">
          Event opprettet.
        </Card>
      ) : null}
      {errorMessage ? (
        <Card className="border border-error/30 bg-error/10 text-sm text-error">
          {decodeURIComponent(errorMessage)}
        </Card>
      ) : null}

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Nytt event</h3>
        <form action={saveEvent} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="returnTo" value="/admin/events/new" />
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Navn
            <Input name="name" required placeholder="Karrieredag Oslo 2026" />
          </label>
          <label className="text-sm font-semibold text-primary">
            Slug
            <Input name="slug" required placeholder="karrieredag-oslo-2026" />
          </label>
          <label className="text-sm font-semibold text-primary">
            Lokasjon
            <Input name="location" placeholder="Oslo Kongressenter" />
          </label>
          <label className="text-sm font-semibold text-primary">
            Start
            <Input name="startsAt" type="datetime-local" required />
          </label>
          <label className="text-sm font-semibold text-primary">
            Slutt
            <Input name="endsAt" type="datetime-local" required />
          </label>
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Beskrivelse
            <Textarea name="description" rows={3} placeholder="Kort tekst om eventet" />
          </label>
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Påmeldingsside for bedrifter (URL)
            <Input
              name="registrationFormUrl"
              type="url"
              placeholder="https://www.oslostudenthub.no/registreringsside-student-hub-2026"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-primary md:col-span-2">
            <input className="h-4 w-4" defaultChecked name="isActive" type="checkbox" />
            Aktivt event
          </label>
          <Button className="md:col-span-2" type="submit">
            Opprett event
          </Button>
        </form>
      </Card>
    </div>
  );
}
