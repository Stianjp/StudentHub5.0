import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser, listStudentConsents } from "@/lib/student";
import { giveConsentToAll, giveConsentToCompany } from "@/app/student/consents/actions";

const INDUSTRY_ALL = "all";

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

  const [{ data: events, error: eventsError }, { data: companies, error: companiesError }] =
    await Promise.all([
      supabase.from("events").select("*").eq("is_active", true).order("starts_at", { ascending: true }),
      supabase.from("companies").select("id, name, industry").order("name"),
    ]);

  if (eventsError) throw eventsError;
  if (companiesError) throw companiesError;

  const eventId =
    typeof params.eventId === "string"
      ? params.eventId
      : events?.[0]?.id ?? "";
  const selectedIndustry =
    typeof params.industry === "string" ? params.industry : INDUSTRY_ALL;

  const industries = Array.from(
    new Set((companies ?? []).map((company) => company.industry).filter(Boolean)),
  ) as string[];

  const filteredCompanies = (companies ?? []).filter((company) => {
    if (selectedIndustry === INDUSTRY_ALL) return true;
    return company.industry === selectedIndustry;
  });

  const consentedCompanyIds = new Set(
    consents
      .filter((consent) => consent.event?.id === eventId)
      .map((consent) => consent.company?.id)
      .filter(Boolean) as string[],
  );

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Samtykke"
        title="Gi samtykke til bedrifter"
        description="Velg event og gi samtykke til flere bedrifter samtidig."
      />

      <Card className="flex flex-col gap-4">
        <form className="grid gap-3 md:grid-cols-2" method="get">
          <label className="text-sm font-semibold text-primary">
            Event
            <Select name="eventId" defaultValue={eventId}>
              {(events ?? []).map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-semibold text-primary">
            Bransjefilter
            <Select name="industry" defaultValue={selectedIndustry}>
              <option value={INDUSTRY_ALL}>Alle bransjer</option>
              {industries.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </Select>
          </label>
          <div className="md:col-span-2">
            <Button variant="secondary" type="submit">
              Oppdater filter
            </Button>
          </div>
        </form>

        <div className="flex flex-wrap gap-3">
          <form action={giveConsentToAll}>
            <input type="hidden" name="eventId" value={eventId} />
            <Button type="submit">Gi samtykke til alle bedrifter</Button>
          </form>
          {selectedIndustry !== INDUSTRY_ALL ? (
            <form action={giveConsentToAll}>
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="industry" value={selectedIndustry} />
              <Button variant="secondary" type="submit">
                Gi samtykke til alle {selectedIndustry}-bedrifter
              </Button>
            </form>
          ) : null}
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary">Bedrifter ({filteredCompanies.length})</h3>
          <Link className="text-sm font-semibold text-primary/70 transition hover:text-primary" href="/student">
            Tilbake til profil
          </Link>
        </div>
        {filteredCompanies.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen bedrifter i denne bransjen.</p>
        ) : (
          <ul className="grid gap-2 text-sm text-ink/80">
            {filteredCompanies.map((company) => (
              <li key={company.id} className="flex flex-col gap-2 rounded-xl border border-primary/10 bg-surface p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-primary">{company.name}</p>
                  <p className="text-xs text-ink/60">{company.industry ?? "Bransje ikke satt"}</p>
                </div>
                <form action={giveConsentToCompany}>
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="companyId" value={company.id} />
                  {consentedCompanyIds.has(company.id) ? (
                    <Badge variant="success">Samtykke gitt</Badge>
                  ) : (
                    <Button variant="secondary" type="submit">
                      Gi samtykke
                    </Button>
                  )}
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Dine samtykker</h3>
        {consents.length === 0 ? (
          <p className="text-sm text-ink/70">Du har ikke gitt samtykke til noen bedrifter ennå.</p>
        ) : (
          <ul className="grid gap-3">
            {consents.map((consent) => (
              <li key={consent.id} className="rounded-xl border border-primary/10 bg-primary/5 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-base font-semibold text-primary">{consent.company?.name ?? "Bedrift"}</p>
                    <p className="text-xs text-ink/70">{consent.event?.name ?? "Event"}</p>
                  </div>
                  <Badge variant={consent.consent ? "success" : "warning"}>
                    {new Date(consent.consented_at).toLocaleString("nb-NO")}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-ink/80">Scope: {consent.scope}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
