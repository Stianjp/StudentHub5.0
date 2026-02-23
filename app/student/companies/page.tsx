import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { LikedCompanies } from "@/components/student/liked-companies";
import { saveLikedCompanies } from "@/app/student/actions";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser } from "@/lib/student";

const INDUSTRY_ALL = "all";
const INDUSTRY_OPTIONS = [
  "Bygg",
  "Data/IT",
  "Elektro",
  "Energi & Miljø",
  "Biotek/Kjemi",
  "Maskin",
  "Økonomi",
  "Øedeøse",
  "HR",
];

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function StudentCompaniesPage({ searchParams }: PageProps) {
  const paramsData = (await (searchParams ?? Promise.resolve({}))) as Record<
    string,
    string | string[] | undefined
  >;
  const saved = paramsData.saved === "1";
  const search = typeof paramsData.q === "string" ? paramsData.q.trim() : "";
  const selectedIndustry = typeof paramsData.industry === "string" ? paramsData.industry : INDUSTRY_ALL;

  const profile = await requireRole("student");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not found");
  }

  const [student, { data: companies, error: companiesError }] = await Promise.all([
    getOrCreateStudentForUser(profile.id, user.email),
    supabase.from("companies").select("id, name, industry").order("name"),
  ]);

  if (companiesError) throw companiesError;
  const allCompanies = companies ?? [];
  const industryOptions = Array.from(
    new Set([...INDUSTRY_OPTIONS, ...allCompanies.map((company) => company.industry).filter(Boolean)]),
  ) as string[];
  const filteredCompanies = allCompanies.filter((company) => {
    const matchesIndustry = selectedIndustry === INDUSTRY_ALL || company.industry === selectedIndustry;
    const normalizedSearch = search.toLowerCase();
    const matchesSearch =
      normalizedSearch.length === 0 ||
      company.name.toLowerCase().includes(normalizedSearch) ||
      (company.industry ?? "").toLowerCase().includes(normalizedSearch);
    return matchesIndustry && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Student"
        title="Utforsk Bedrifter"
        description="Finn flere bedrifter og oppdater favorittene dine."
        actions={
          <Link className="button-link text-xs" href="/student/dashboard">
            Tilbake til oversikt
          </Link>
        }
      />

      {saved ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">
          Favoritter oppdatert.
        </Card>
      ) : null}

      <Card className="flex flex-col gap-5">
        <p className="text-sm text-ink/80">
          Velg bedrifter du vil følge. Du kan oppdatere listen når som helst.
        </p>

        <form method="get" className="grid gap-3 md:grid-cols-3">
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Søk etter bedrift
            <Input
              name="q"
              defaultValue={search}
              placeholder="Søk på navn eller bransje…"
              autoComplete="off"
            />
          </label>
          <label className="text-sm font-semibold text-primary">
            Bransje
            <Select name="industry" defaultValue={selectedIndustry}>
              <option value={INDUSTRY_ALL}>Alle bransjer</option>
              {industryOptions.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </Select>
          </label>
          <div className="flex flex-wrap gap-2 md:col-span-3">
            <Button type="submit" variant="secondary">
              Oppdater filter
            </Button>
            <Link href="/student/companies" className="button-link text-xs">
              Nullstill
            </Link>
          </div>
        </form>

        <p className="text-xs text-ink/70">
          Viser {filteredCompanies.length} av {allCompanies.length} bedrifter.
        </p>

        {allCompanies.length > 0 ? (
          <form action={saveLikedCompanies} className="flex flex-col gap-4">
            <LikedCompanies companies={filteredCompanies} initialSelected={student.liked_company_ids ?? []} />
            <div className="flex flex-wrap gap-3">
              <Button type="submit">Lagre favoritter</Button>
              <Link className="button-link text-xs" href="/student">
                Gå til profil
              </Link>
            </div>
          </form>
        ) : (
          <p className="text-sm text-ink/70">Ingen bedrifter er registrert ennå.</p>
        )}
      </Card>
    </div>
  );
}
