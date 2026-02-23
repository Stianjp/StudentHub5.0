import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser, listStudentConsents } from "@/lib/student";
import {
  changeStudentPassword,
  deleteStudentAccount,
  giveConsentToAll,
  giveConsentToCompany,
  withdrawConsent,
} from "@/app/student/consents/actions";

const INDUSTRY_ALL = "all";
const STATUS_ALL = "all";
const STATUS_CONSENTED = "consented";
const STATUS_NOT_CONSENTED = "not_consented";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StudentConsentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const profile = await requireRole("student");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");

  const student = await getOrCreateStudentForUser(profile.id, user.email);
  const consents = await listStudentConsents(student.id);

  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("id, name, industry")
    .order("name");

  if (companiesError) throw companiesError;

  const selectedIndustry = typeof params.industry === "string" && params.industry ? params.industry : INDUSTRY_ALL;
  const statusParam = typeof params.status === "string" ? params.status : STATUS_ALL;
  const selectedStatus =
    statusParam === STATUS_CONSENTED || statusParam === STATUS_NOT_CONSENTED ? statusParam : STATUS_ALL;
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const normalizedSearch = search.toLowerCase();
  const passwordUpdated = params.passwordUpdated === "1";
  const accountError = typeof params.accountError === "string" ? params.accountError : "";

  const industries = Array.from(
    new Set(
      (companies ?? [])
        .map((company) => company.industry)
        .filter((industry): industry is string => Boolean(industry)),
    ),
  ).sort((a, b) => a.localeCompare(b, "nb"));

  const latestConsentByCompanyId = new Map<string, (typeof consents)[number]>();
  for (const consent of consents) {
    const companyId = consent.company?.id;
    if (!companyId || latestConsentByCompanyId.has(companyId)) continue;
    latestConsentByCompanyId.set(companyId, consent);
  }

  const consentedCompanyIds = new Set(
    Array.from(latestConsentByCompanyId.entries())
      .filter(([, consent]) => consent.consent)
      .map(([companyId]) => companyId),
  );

  const totalCompanies = (companies ?? []).length;
  const consentedCount = consentedCompanyIds.size;

  const filteredCompanies = (companies ?? []).filter((company) => {
    if (selectedIndustry !== INDUSTRY_ALL && company.industry !== selectedIndustry) return false;

    const latestConsent = latestConsentByCompanyId.get(company.id);
    const hasConsent = Boolean(latestConsent?.consent);
    if (selectedStatus === STATUS_CONSENTED && !hasConsent) return false;
    if (selectedStatus === STATUS_NOT_CONSENTED && hasConsent) return false;

    if (!normalizedSearch) return true;
    const haystack = `${company.name} ${company.industry ?? ""}`.toLowerCase();
    return haystack.includes(normalizedSearch);
  });

  return (
    <div className="flex flex-col gap-8 text-surface">
      <div className="rounded-3xl border border-surface/10 bg-primary p-6 md:p-10">
        <SectionHeader
          eyebrow="Samtykker"
          title="Dine samtykker"
          description="Oversikt over dine samtykker hos bedriftene."
          tone="light"
        />

        <Card className="mt-8 flex flex-col gap-4 bg-primary text-surface ring-1 ring-white/10">
          <form className="grid gap-3 md:grid-cols-3" method="get">
            <label className="text-sm font-semibold text-surface md:col-span-2">
              Søk
              <Input
                name="q"
                defaultValue={search}
                placeholder="Søk på bedriftsnavn eller bransje..."
                autoComplete="off"
              />
            </label>
            <label className="text-sm font-semibold text-surface">
              Bransje
              <Select name="industry" defaultValue={selectedIndustry}>
                <option value={INDUSTRY_ALL}>Alle bransjer</option>
                {industries.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm font-semibold text-surface">
              Samtykkestatus
              <Select name="status" defaultValue={selectedStatus}>
                <option value={STATUS_ALL}>Alle</option>
                <option value={STATUS_CONSENTED}>Samtykke gitt</option>
                <option value={STATUS_NOT_CONSENTED}>Ikke samtykket</option>
              </Select>
            </label>
            <div className="flex items-end gap-3">
              <Button variant="secondary" type="submit">
                Oppdater filter
              </Button>
              <Link className="button-link text-xs" href="/student/consents">
                Nullstill
              </Link>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">{consentedCount} med samtykke</Badge>
            <Badge variant="warning">{Math.max(totalCompanies - consentedCount, 0)} uten samtykke</Badge>
            <span className="text-xs text-surface/70">
              Viser {filteredCompanies.length} av {totalCompanies} bedrifter.
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            <form action={giveConsentToAll}>
              <Button type="submit">Gi samtykke til alle bedrifter</Button>
            </form>
            {selectedIndustry !== INDUSTRY_ALL ? (
              <form action={giveConsentToAll}>
                <input type="hidden" name="industry" value={selectedIndustry} />
                <Button variant="secondary" type="submit">
                  Gi samtykke til alle {selectedIndustry}-bedrifter
                </Button>
              </form>
            ) : null}
          </div>
        </Card>

        <Card className="mt-6 flex flex-col gap-6 bg-primary text-surface ring-1 ring-white/10">
          <h3 className="text-lg font-bold text-surface">Dine samtykker ({filteredCompanies.length})</h3>
          {filteredCompanies.length === 0 ? (
            <p className="text-sm text-surface/70">Ingen treff for valgt søk eller filter.</p>
          ) : (
            <ul className="grid gap-6 text-sm text-surface/80">
              {filteredCompanies.map((company) => {
                const latestConsent = latestConsentByCompanyId.get(company.id);
                const hasConsent = Boolean(latestConsent?.consent);
                const updatedAt = latestConsent?.updated_at ?? latestConsent?.consented_at ?? null;
                const action = hasConsent ? withdrawConsent : giveConsentToCompany;
                return (
                  <li
                    key={company.id}
                    className={`flex flex-col gap-2 rounded-xl border p-4 md:flex-row md:items-center md:justify-between ${
                      hasConsent
                        ? "border-secondary/60 bg-secondary/15 shadow-soft"
                        : "border-surface/10 bg-[#1B0858]"
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-surface">{company.name}</p>
                      <p className="text-xs text-surface/70">{company.industry ?? "Bransje ikke satt"}</p>
                      <p className="mt-1 text-xs text-surface/70">
                        {updatedAt
                          ? `Sist oppdatert ${new Date(updatedAt).toLocaleString("nb-NO")}`
                          : "Ingen registrert samtykkehistorikk ennå."}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={hasConsent ? "success" : "warning"}>
                        {hasConsent ? "Samtykke gitt" : "Ikke samtykket"}
                      </Badge>
                      <form action={action}>
                        <input type="hidden" name="companyId" value={company.id} />
                        <Button variant={hasConsent ? "ghost" : "secondary"} type="submit">
                          {hasConsent ? "Fjern samtykke" : "Gi samtykke"}
                        </Button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="rounded-3xl border border-surface/10 bg-primary p-6 md:p-10">
        <SectionHeader
          eyebrow="Konto"
          title="Innstillinger"
          description="Endre passord eller slett profilen din."
          tone="light"
        />

        {passwordUpdated ? (
          <Card className="mt-8 border border-success/30 bg-success/10 text-sm text-success">
            Passordet er oppdatert.
          </Card>
        ) : null}
        {accountError ? (
          <Card className="mt-4 border border-error/30 bg-error/10 text-sm text-error">
            {decodeURIComponent(accountError)}
          </Card>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card className="flex flex-col gap-4 bg-primary text-surface ring-1 ring-white/10">
            <h3 className="text-lg font-bold text-surface">Endre Passord</h3>
            <form action={changeStudentPassword} className="grid gap-3">
              <label className="text-sm font-semibold text-surface">
                Nytt passord
                <Input
                  name="newPassword"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Minst 8 tegn"
                />
              </label>
              <label className="text-sm font-semibold text-surface">
                Bekreft nytt passord
                <Input
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Gjenta passordet"
                />
              </label>
              <div>
                <Button type="submit">Oppdater passord</Button>
              </div>
            </form>
          </Card>

          <Card className="flex flex-col gap-4 bg-primary text-surface ring-1 ring-white/10">
            <h3 className="text-lg font-bold text-surface">Slett Profil</h3>
            <p className="text-sm text-surface/80">
              Denne handlingen kan ikke angres. Konto, profil og tilknyttede studentdata blir slettet.
            </p>
            <form action={deleteStudentAccount} className="grid gap-3">
              <label className="text-sm font-semibold text-surface">
                Skriv <span className="font-black">SLETT</span> for å bekrefte
                <Input
                  name="confirmDelete"
                  required
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="SLETT"
                />
              </label>
              <div>
                <Button variant="danger" type="submit">
                  Slett profil
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
