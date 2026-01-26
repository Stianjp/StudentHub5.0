import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireRole } from "@/lib/auth";
import { getEventWithRegistrations, listCompanies } from "@/lib/admin";
import { registerCompaniesBulk, registerCompany } from "@/app/admin/actions";

const packageLabel: Record<string, string> = {
  standard: "Standard",
  silver: "Sølv",
  gold: "Gull",
  platinum: "Platinum",
};

type PageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function AdminEventDetailPage({ params }: PageProps) {
  await requireRole("admin");
  const { eventId } = await params;

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
          <Link className="text-sm font-semibold text-primary/70 transition hover:text-primary" href="/admin/events">
            ← Tilbake
          </Link>
        }
      />

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Registrer bedrift til event</h3>
        {availableCompanies.length === 0 ? (
          <p className="text-sm text-ink/70">Alle bedrifter er allerede registrert.</p>
        ) : (
          <form action={registerCompany} className="grid gap-3 md:grid-cols-3">
            <input name="eventId" type="hidden" value={eventId} readOnly />
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
              Standtype (valgfritt)
              <Input name="standType" placeholder="Standard, Premium" />
            </label>
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
          <label className="text-sm font-semibold text-primary">
            Standtype (valgfritt)
            <Input name="standType" placeholder="Standard, Premium" />
          </label>
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
                  <p className="text-xs text-ink/70">Standtype: {reg.stand_type ?? "—"}</p>
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
