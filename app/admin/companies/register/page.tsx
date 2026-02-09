import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createCompanyAction, addCompanyDomainAction, approveCompanyAccessAction } from "@/app/admin/actions";
import { listCompanies, listCompanyAccessRequests, listCompanyDomains } from "@/lib/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminRegisterCompanyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const saved = params.saved === "1";
  const errorMessage = typeof params.error === "string" ? params.error : "";
  const error = Boolean(errorMessage) && errorMessage !== "1";

  const supabase = await createServerSupabaseClient();
  const [companies, companyDomains, accessRequests, { data: events }] = await Promise.all([
    listCompanies(),
    listCompanyDomains(),
    listCompanyAccessRequests(),
    supabase.from("events").select("id, name").order("starts_at", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Bedrifter"
        title="Registrer en bedrift"
        description="Opprett bedrift, legg til domene og godkjenn tilgangsforespørsler."
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
        <h3 className="text-lg font-bold text-primary">Opprett bedrift</h3>
        <form action={createCompanyAction} className="grid gap-3 md:grid-cols-4">
          <input type="hidden" name="returnTo" value="/admin/companies/register" />
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Bedriftsnavn
            <Input name="name" required placeholder="F.eks. Equinor" />
          </label>
          <label className="text-sm font-semibold text-primary">
            Org.nr
            <Input name="orgNumber" required placeholder="9 siffer" />
          </label>
          <label className="text-sm font-semibold text-primary">
            Bransje
            <Input name="industry" placeholder="Teknologi" />
          </label>
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Lokasjon
            <Input name="location" placeholder="Oslo" />
          </label>
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Domene (valgfritt)
            <Input name="domain" placeholder="bedrift.no" />
          </label>
          <Button className="md:col-span-4" type="submit">
            Opprett bedrift
          </Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Domener for bedrifts-tilgang</h3>
        {companies.length === 0 ? (
          <p className="text-sm text-ink/70">Opprett en bedrift før du legger til domene.</p>
        ) : (
          <form action={addCompanyDomainAction} className="grid gap-3 md:grid-cols-3">
            <input type="hidden" name="returnTo" value="/admin/companies/register" />
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
              Domene
              <Input name="domain" required placeholder="equinor.com" />
            </label>
            <Button className="md:col-span-3" variant="secondary" type="submit">
              Legg til domene
            </Button>
          </form>
        )}
        {companyDomains.length === 0 ? (
          <p className="text-xs text-ink/60">Ingen domener registrert ennå.</p>
        ) : (
          <div className="flex flex-wrap gap-2 text-xs text-ink/70">
            {companyDomains.map((domain) => (
              <span key={domain.id} className="rounded-full bg-primary/5 px-3 py-1">
                {domain.domain} · {domain.company?.name ?? "Bedrift"}
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Tilgangsforespørsler</h3>
        {accessRequests.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen forespørsler akkurat nå.</p>
        ) : (
          <div className="grid gap-3">
            {accessRequests.map((request) => (
              <div key={request.id} className="rounded-xl border border-primary/10 bg-primary/5 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-primary">{request.email}</p>
                    <p className="text-xs text-ink/70">
                      {request.domain} · {request.company?.name ?? "Ny bedrift"}
                    </p>
                    {request.org_number ? (
                      <p className="text-xs text-ink/70">Org.nr: {request.org_number}</p>
                    ) : null}
                  </div>
                  <form action={approveCompanyAccessAction} className="flex flex-col gap-2 md:flex-row md:items-center">
                    <input type="hidden" name="returnTo" value="/admin/companies/register" />
                    <input type="hidden" name="requestId" value={request.id} />
                    <input type="hidden" name="domain" value={request.domain ?? ""} />
                    <input type="hidden" name="orgNumber" value={request.org_number ?? ""} />
                    <input type="hidden" name="email" value={request.email ?? ""} />
                    <label className="text-xs font-semibold text-primary">
                      Bedrift
                      <Select name="companyId" required defaultValue={request.company_id ?? "new"}>
                        <option value="new">Opprett ny bedrift</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <input type="hidden" name="userId" value={request.user_id} />
                    <Button type="submit">Godkjenn</Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Registrer bedrift til event</h3>
        <p className="text-sm text-ink/70">Bruk menyvalget “Registrer bedrift til event” for å fullføre.</p>
        {(events ?? []).length ? null : <p className="text-xs text-ink/60">Ingen events registrert ennå.</p>}
      </Card>
    </div>
  );
}
