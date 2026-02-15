import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireRole } from "@/lib/auth";
import { getEventWithRegistrations, listCompanies } from "@/lib/admin";
import { registerCompaniesBulk, registerCompany, saveEvent } from "@/app/admin/actions";

const packageLabel: Record<string, string> = {
  standard: "Standard",
  silver: "Sølv",
  gold: "Gull",
  platinum: "Platinum",
};

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

export default async function AdminEventDetailPage({ params, searchParams }: PageProps) {
  await requireRole("admin");
  const { eventId } = await params;
  const paramsData = (await (searchParams ?? Promise.resolve({}))) as Record<string, string | string[] | undefined>;
  const saved = paramsData.saved === "1";
  const errorMessage = typeof paramsData.error === "string" ? paramsData.error : "";
  const error = Boolean(errorMessage) && errorMessage !== "1";

  const [eventData, companies] = await Promise.all([
    getEventWithRegistrations(eventId),
    listCompanies(),
  ]);

  const registrations = eventData.registrations as Array<{
    id: string;
    stand_type: string | null;
    package: string;
    company?: { id?: string; name?: string };
  }>;
  const registeredCompanyIds = new Set(
    registrations.map((reg) => reg.company?.id).filter(Boolean) as string[],
  );

  const availableCompanies = companies.filter((company) => !registeredCompanyIds.has(company.id));

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Event"
        title={eventData.event.name}
        description="Oversikt over registrerte bedrifter og mulighet til å legge til flere."
        actions={
          <Link className="text-sm font-semibold text-primary/70 transition hover:text-primary" href="/admin/events/overview">
            Tilbake
          </Link>
        }
      />

      {saved ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">
          Oppdatering lagret.
        </Card>
      ) : null}
      {error ? (
        <Card className="border border-error/30 bg-error/10 text-sm text-error">
          {errorMessage ? decodeURIComponent(errorMessage) : "Kunne ikke lagre. Sjekk feltene og prøv igjen."}
        </Card>
      ) : null}

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Rediger event</h3>
        <form action={saveEvent} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="id" value={eventData.event.id} />
          <input type="hidden" name="returnTo" value={`/admin/events/${eventId}`} />
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Navn
            <Input name="name" required defaultValue={eventData.event.name} />
          </label>
          <label className="text-sm font-semibold text-primary">
            Slug
            <Input name="slug" required defaultValue={eventData.event.slug} />
          </label>
          <label className="text-sm font-semibold text-primary">
            Lokasjon
            <Input name="location" defaultValue={eventData.event.location ?? ""} />
          </label>
          <label className="text-sm font-semibold text-primary">
            Start
            <Input name="startsAt" type="datetime-local" required defaultValue={toDateTimeLocal(eventData.event.starts_at)} />
          </label>
          <label className="text-sm font-semibold text-primary">
            Slutt
            <Input name="endsAt" type="datetime-local" required defaultValue={toDateTimeLocal(eventData.event.ends_at)} />
          </label>
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Beskrivelse
            <Textarea name="description" rows={3} defaultValue={eventData.event.description ?? ""} />
          </label>
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Påmeldingsside for bedrifter (URL)
            <Input
              name="registrationFormUrl"
              type="url"
              placeholder="https://www.oslostudenthub.no/registreringsside-student-hub-2026"
              defaultValue={eventData.event.registration_form_url ?? ""}
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-primary md:col-span-2">
            <input className="h-4 w-4" name="isActive" type="checkbox" defaultChecked={eventData.event.is_active} />
            Aktivt event
          </label>
          <Button className="md:col-span-2" type="submit">
            Lagre event
          </Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Registrer bedrift til event</h3>
        {availableCompanies.length === 0 ? (
          <p className="text-sm text-ink/70">Alle bedrifter er allerede registrert.</p>
        ) : (
          <form action={registerCompany} className="grid gap-3 md:grid-cols-3">
            <input name="eventId" type="hidden" value={eventId} readOnly />
            <input type="hidden" name="returnTo" value={`/admin/events/${eventId}`} />
            <label className="text-sm font-semibold text-primary">
              Bedrift
              <Select name="companyId" required defaultValue={availableCompanies[0]?.id}>
                {availableCompanies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm font-semibold text-primary">
              Pakke
              <Select name="package" defaultValue="standard">
                <option value="standard">Standard</option>
                <option value="silver">Sølv</option>
                <option value="gold">Gull</option>
                <option value="platinum">Platinum</option>
              </Select>
            </label>
            <div className="md:col-span-3">
              <p className="text-sm font-semibold text-primary">
                Velg bedriftens kategori (oppdateres på bedriften og kan endres av bedriften selv)
              </p>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                {[
                  "BYGGINGENIØRER",
                  "DATAINGENIØR/IT",
                  "ELEKTROINGENIØRER",
                  "ENERGI & MILJØ INGENIØR",
                  "BIOTEKNOLOGI- OG KJEMIINGENIØR",
                  "MASKININGENIØRER",
                  "ØKONOMI OG ADMINISTRASJON",
                  "LEDELSE",
                  "HUMAN RESOURCES",
                ].map((category) => (
                  <label
                    key={category}
                    className="flex items-center gap-2 rounded-xl border border-primary/10 bg-surface px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="categoryTags"
                      value={category}
                      className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                    />
                    <span className="font-semibold text-primary">{category}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button variant="secondary" className="md:col-span-3" type="submit">
              Registrer til event
            </Button>
          </form>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Bulk-registrering</h3>
        <form action={registerCompaniesBulk} className="grid gap-4">
          <input name="eventId" type="hidden" value={eventId} readOnly />
          <input type="hidden" name="returnTo" value={`/admin/events/${eventId}`} />
          <label className="text-sm font-semibold text-primary">
            Pakke
            <Select name="package" defaultValue="standard">
              <option value="standard">Standard</option>
              <option value="silver">Sølv</option>
              <option value="gold">Gull</option>
              <option value="platinum">Platinum</option>
            </Select>
          </label>
          <div>
            <p className="text-sm font-semibold text-primary">
              Velg bedriftens kategori (oppdateres på bedriften og kan endres av bedriften selv)
            </p>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              {[
                "BYGGINGENIØRER",
                "DATAINGENIØR/IT",
                "ELEKTROINGENIØRER",
                "ENERGI & MILJØ INGENIØR",
                "BIOTEKNOLOGI- OG KJEMIINGENIØR",
                "MASKININGENIØRER",
                "ØKONOMI OG ADMINISTRASJON",
                "LEDELSE",
                "HUMAN RESOURCES",
              ].map((category) => (
                <label
                  key={category}
                  className="flex items-center gap-2 rounded-xl border border-primary/10 bg-surface px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="categoryTags"
                    value={category}
                    className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                  />
                  <span className="font-semibold text-primary">{category}</span>
                </label>
              ))}
            </div>
          </div>
          {availableCompanies.length === 0 ? (
            <p className="text-sm text-ink/70">Alle bedrifter er allerede registrert.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {availableCompanies.map((company) => (
                <label
                  key={company.id}
                  className="flex items-center gap-2 rounded-xl border border-primary/10 bg-surface px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="companyIds"
                    value={company.id}
                    className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                  />
                  <span className="font-semibold text-primary">{company.name}</span>
                </label>
              ))}
            </div>
          )}
          <Button variant="secondary" type="submit">
            Registrer valgte bedrifter
          </Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Registrerte bedrifter</h3>
        {eventData.registrations.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen registrerte bedrifter enda.</p>
        ) : (
          <ul className="grid gap-2 text-sm text-ink/80">
            {registrations.map((reg) => (
              <li key={reg.id} className="flex items-center justify-between rounded-xl bg-primary/5 px-3 py-2">
                <div>
                  <p className="font-semibold text-primary">{reg.company?.name ?? "Bedrift"}</p>
                  <p className="text-xs text-ink/70">Standtype: {reg.stand_type ?? "-"}</p>
                </div>
                <span className="text-xs font-semibold text-primary/70">
                  {packageLabel[reg.package] ?? reg.package}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
