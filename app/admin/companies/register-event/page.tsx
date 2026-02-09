import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listCompanies } from "@/lib/admin";
import { registerCompany } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function packageLabel(pkg?: string | null) {
  if (!pkg) return "ikke registrert";
  if (pkg === "standard") return "Standard";
  if (pkg === "silver") return "Sølv";
  if (pkg === "gold") return "Gull";
  if (pkg === "platinum") return "Platinum";
  return pkg;
}

export default async function AdminRegisterCompanyEventPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const saved = params.saved === "1";
  const errorMessage = typeof params.error === "string" ? params.error : "";
  const error = Boolean(errorMessage) && errorMessage !== "1";
  const supabase = await createServerSupabaseClient();

  const [{ data: events }, companies, { data: eventCompanies }] = await Promise.all([
    supabase.from("events").select("*").order("starts_at", { ascending: false }),
    listCompanies(),
    supabase.from("event_companies").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Bedrifter"
        title="Registrer bedrift til event"
        description="Velg event, bedrift, pakke og kategori."
        actions={<Link className="button-link text-xs" href="/admin/companies/overview">Oversikt bedrifter</Link>}
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
        <h3 className="text-lg font-bold text-primary">Registrer bedrift til event</h3>
        {companies.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen bedrifter å registrere.</p>
        ) : (
          <form action={registerCompany} className="grid gap-3 md:grid-cols-4">
            <input type="hidden" name="returnTo" value="/admin/companies/register-event" />
            <label className="text-sm font-semibold text-primary">
              Event
              <Select name="eventId" required defaultValue={events?.[0]?.id}>
                {(events ?? []).map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </Select>
            </label>
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
            <label className="text-sm font-semibold text-primary">
              Pakke
              <Select name="package" defaultValue="standard">
                <option value="standard">Standard</option>
                <option value="silver">Sølv</option>
                <option value="gold">Gull</option>
                <option value="platinum">Platinum</option>
              </Select>
            </label>
            <div className="md:col-span-4">
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
                  "MASKINIGENIØRER",
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
            <Button className="md:col-span-4" variant="secondary" type="submit">
              Registrer til event
            </Button>
          </form>
        )}
      </Card>

      <Card className="overflow-x-auto">
        <h3 className="px-4 py-4 text-lg font-bold text-primary">Oversikt over bedrifter til event</h3>
        <table className="min-w-full divide-y divide-primary/10 text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-primary/60">
              <th className="px-4 py-3">Bedrift</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Pakke</th>
              <th className="px-4 py-3">Handling</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/5">
            {(eventCompanies ?? []).map((row) => {
              const company = companies.find((c) => c.id === row.company_id);
              const event = (events ?? []).find((e) => e.id === row.event_id);
              return (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-semibold text-primary">{company?.name ?? "Bedrift"}</td>
                  <td className="px-4 py-3 text-ink/80">{event?.name ?? "Event"}</td>
                  <td className="px-4 py-3 text-ink/80">{packageLabel(row.package)}</td>
                  <td className="px-4 py-3">
                    <Link className="text-xs font-semibold text-primary/70 hover:text-primary" href={`/admin/events/${row.event_id}`}>
                      Rediger
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(eventCompanies ?? []).length === 0 ? (
          <p className="px-4 py-4 text-sm text-ink/70">Ingen bedrifter registrert på events enda.</p>
        ) : null}
      </Card>
    </div>
  );
}
