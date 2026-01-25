import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Textarea } from "@/components/ui/textarea";
import { saveEvent } from "@/app/admin/actions";
import { listEventsWithStats } from "@/lib/admin";

function toLocalInput(value: string) {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default async function AdminEventsPage() {
  const events = await listEventsWithStats();

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Events"
        title="Opprett og rediger events"
        description="Events er kjernen for stand-QR, matching og ROI."
      />

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Nytt event</h3>
        <form action={saveEvent} className="grid gap-3 md:grid-cols-2">
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
          <label className="flex items-center gap-2 text-sm font-semibold text-primary md:col-span-2">
            <input className="h-4 w-4" defaultChecked name="isActive" type="checkbox" />
            Aktivt event
          </label>
          <Button className="md:col-span-2" type="submit">
            Opprett event
          </Button>
        </form>
      </Card>

      <section className="grid gap-4">
        {events.map((event) => (
          <Card key={event.id} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-lg font-bold text-primary">{event.name}</p>
                <p className="text-xs text-ink/70">/{event.slug}</p>
              </div>
              <div className="text-xs font-semibold text-primary/70">
                {event.companyCount} bedrifter · {event.visitCount} besøk · {event.leadCount} leads
              </div>
            </div>
            <form action={saveEvent} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="id" value={event.id} readOnly />
              <label className="text-sm font-semibold text-primary md:col-span-2">
                Navn
                <Input name="name" defaultValue={event.name} required />
              </label>
              <label className="text-sm font-semibold text-primary">
                Slug
                <Input name="slug" defaultValue={event.slug} required />
              </label>
              <label className="text-sm font-semibold text-primary">
                Lokasjon
                <Input name="location" defaultValue={event.location ?? ""} />
              </label>
              <label className="text-sm font-semibold text-primary">
                Start
                <Input name="startsAt" type="datetime-local" defaultValue={toLocalInput(event.starts_at)} required />
              </label>
              <label className="text-sm font-semibold text-primary">
                Slutt
                <Input name="endsAt" type="datetime-local" defaultValue={toLocalInput(event.ends_at)} required />
              </label>
              <label className="text-sm font-semibold text-primary md:col-span-2">
                Beskrivelse
                <Textarea name="description" defaultValue={event.description ?? ""} rows={3} />
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-primary md:col-span-2">
                <input className="h-4 w-4" name="isActive" type="checkbox" defaultChecked={event.is_active} />
                Aktivt event
              </label>
              <Button variant="secondary" className="md:col-span-2" type="submit">
                Lagre endringer
              </Button>
            </form>
          </Card>
        ))}
      </section>
    </div>
  );
}
