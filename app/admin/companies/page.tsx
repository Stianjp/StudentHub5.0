import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { inviteCompany, registerCompany, setPackage } from "@/app/admin/actions";
import { listCompanies, listEventCompanies } from "@/lib/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type CompaniesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function packageLabel(pkg?: string | null) {
  if (!pkg) return "ikke registrert";
  if (pkg === "standard") return "Standard";
  if (pkg === "silver") return "Sølv";
  if (pkg === "gold") return "Gull";
  if (pkg === "platinum") return "Platinum";
  return pkg;
}

export default async function AdminCompaniesPage({ searchParams }: CompaniesPageProps) {
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();

  const [{ data: events, error: eventsError }, companies] = await Promise.all([
    supabase.from("events").select("*").order("starts_at", { ascending: false }),
    listCompanies(),
  ]);

  if (eventsError) throw eventsError;
  if (!events || events.length === 0) {
    return (
      <Card>
        <SectionHeader title="Bedrifter" description="Opprett et event først." />
        <Link
          className={cn(
            "mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-surface",
          )}
          href="/admin/events"
        >
          Gå til events
        </Link>
      </Card>
    );
  }

  const requestedEventId = typeof params.eventId === "string" ? params.eventId : events[0].id;
  const currentEvent = events.find((event) => event.id === requestedEventId) ?? events[0];

  const eventCompanies = await listEventCompanies(currentEvent.id);
  const eventCompanyMap = new Map(eventCompanies.map((row) => [row.company_id, row]));

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Bedrifter"
        title="Invitasjoner og pakker"
        description="Sett pakker per bedrift per event. Platinum styrer ROI-tilgang."
        actions={
          <div className="flex flex-wrap gap-2">
            {events.map((event) => (
              <Link
                key={event.id}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-semibold transition",
                  event.id === currentEvent.id
                    ? "bg-primary text-surface"
                    : "bg-primary/5 text-primary hover:bg-primary/10",
                )}
                href={`/admin/companies?eventId=${event.id}`}
              >
                {event.name}
              </Link>
            ))}
          </div>
        }
      />

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Inviter bedrift</h3>
        <form action={inviteCompany} className="grid gap-3 md:grid-cols-3">
          <input name="eventId" type="hidden" value={currentEvent.id} readOnly />
          <label className="text-sm font-semibold text-primary">
            Bedrift
            <Select name="companyId" required defaultValue={companies[0]?.id}>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Kontakt e-post
            <Input name="email" required placeholder="kontakt@bedrift.no" />
          </label>
          <Button className="md:col-span-3" type="submit">
            Send invitasjon
          </Button>
        </form>
      </Card>

      <section className="grid gap-4">
        {companies.map((company) => {
          const registration = eventCompanyMap.get(company.id);
          return (
            <Card key={company.id} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-lg font-bold text-primary">{company.name}</p>
                  <p className="text-xs text-ink/70">{company.industry ?? "Bransje ikke satt"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={registration?.package === "platinum" ? "success" : "default"}>
                    {packageLabel(registration?.package)}
                  </Badge>
                </div>
              </div>
              <form action={registerCompany} className="grid gap-3 md:grid-cols-3">
                <input name="eventId" type="hidden" value={currentEvent.id} readOnly />
                <input name="companyId" type="hidden" value={company.id} readOnly />
                <label className="text-sm font-semibold text-primary md:col-span-2">
                  Standtype (valgfritt)
                  <Input name="standType" defaultValue={registration?.stand_type ?? ""} placeholder="Standard, Premium" />
                </label>
                <Button variant="secondary" className="md:self-end" type="submit">
                  Registrer til event
                </Button>
              </form>
              <form action={setPackage} className="grid gap-3 md:grid-cols-4">
                <input name="eventId" type="hidden" value={currentEvent.id} readOnly />
                <input name="companyId" type="hidden" value={company.id} readOnly />
                <label className="text-sm font-semibold text-primary">
                  Pakke
                  <Select name="package" defaultValue={registration?.package ?? "standard"}>
                    <option value="standard">Standard</option>
                    <option value="silver">Sølv</option>
                    <option value="gold">Gull</option>
                    <option value="platinum">Platinum</option>
                  </Select>
                </label>
                <label className="text-sm font-semibold text-primary">
                  Tilgang fra
                  <Input name="accessFrom" type="datetime-local" defaultValue={toLocalInput(registration?.access_from ?? null)} />
                </label>
                <label className="text-sm font-semibold text-primary">
                  Tilgang til
                  <Input name="accessUntil" type="datetime-local" defaultValue={toLocalInput(registration?.access_until ?? null)} />
                </label>
                <Button variant="secondary" className="md:self-end" type="submit">
                  Lagre
                </Button>
              </form>
              {registration?.invited_email ? (
                <p className="text-xs text-ink/70">Invitert: {registration.invited_email}</p>
              ) : null}
            </Card>
          );
        })}
      </section>
    </div>
  );
}
