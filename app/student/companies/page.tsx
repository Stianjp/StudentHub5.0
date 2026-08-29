import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { LikedCompanies } from "@/components/student/liked-companies";
import { saveLikedCompanies } from "@/app/student/actions";
import { requireRole } from "@/lib/auth";
import { getLatestCompanyRegistrationLogos } from "@/lib/company";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser } from "@/lib/student";
import { getStudentCategoryLabel } from "@/lib/student-company-display";

const INDUSTRY_ALL = "all";
const INDUSTRY_OPTIONS = [
  "Bygg",
  "Data/IT",
  "Elektro",
  "Energi & Miljø",
  "Biotek/Kjemi",
  "Maskin",
  "Økonomi",
  "Ledelse",
  "HR",
];

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

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
    supabase.from("companies").select("id, name, industry, recruitment_fields").order("name"),
  ]);

  if (companiesError) throw companiesError;
  const allCompanies = (companies ?? []) as Array<{
    id: string;
    name: string;
    industry: string | null;
    recruitment_fields: string[] | null;
  }>;
  const companyLogoMap = await getLatestCompanyRegistrationLogos(
    allCompanies.map((company) => company.id),
  );
  const industryOptions = Array.from(
    new Set([...INDUSTRY_OPTIONS, ...allCompanies.map((company) => company.industry).filter(Boolean)]),
  ) as string[];
  const filteredCompanies = allCompanies.filter((company) => {
    const matchesIndustry = selectedIndustry === INDUSTRY_ALL || company.industry === selectedIndustry;
    const normalizedSearch = search.toLowerCase();
    const matchesSearch =
      normalizedSearch.length === 0 ||
      company.name.toLowerCase().includes(normalizedSearch) ||
      (company.industry ?? "").toLowerCase().includes(normalizedSearch) ||
      (company.recruitment_fields ?? []).join(" ").toLowerCase().includes(normalizedSearch);
    return matchesIndustry && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Student"
        title="Explore companies"
        description="Discover companies and update your favourites."
        actions={
          <Link className="button-link text-xs" href="/student/dashboard">
            Back to dashboard
          </Link>
        }
      />

      {saved ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">
          Favourites updated.
        </Card>
      ) : null}

      <Card className="flex flex-col gap-5">
        <p className="text-sm text-ink/80">
          Select the companies you want to follow. You can update the list at any time.
        </p>
        <p className="text-xs font-semibold text-secondary">
          Adding a company to your favourites also gives it permission to contact you.
        </p>

        <form method="get" className="grid gap-3 md:grid-cols-3">
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Search for a company
            <Input
              name="q"
              defaultValue={search}
              placeholder="Search by name or industry..."
              autoComplete="off"
            />
          </label>
          <label className="text-sm font-semibold text-primary">
            Industry
            <Select name="industry" defaultValue={selectedIndustry}>
              <option value={INDUSTRY_ALL}>All industries</option>
              {industryOptions.map((industry) => (
                <option key={industry} value={industry}>
                  {getStudentCategoryLabel(industry)}
                </option>
              ))}
            </Select>
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:col-span-3">
            <Button className="w-full sm:w-auto" type="submit" variant="secondary">
              Apply filters
            </Button>
            <Link href="/student/companies" className="button-link text-xs">
              Reset
            </Link>
          </div>
        </form>

        <p className="text-xs text-ink/70">
          Showing {filteredCompanies.length} of {allCompanies.length} companies.
        </p>

        {allCompanies.length > 0 ? (
          <form action={saveLikedCompanies} className="flex flex-col gap-4">
            <LikedCompanies
              companies={filteredCompanies.map((company) => ({
                id: company.id,
                name: company.name,
                industry: company.industry,
                recruitmentFields: company.recruitment_fields,
                logoUrl: companyLogoMap[company.id] ?? null,
              }))}
              initialSelected={student.liked_company_ids ?? []}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button className="w-full sm:w-auto" type="submit">Save favourites</Button>
              <Link className="button-link text-xs" href="/student">
                Go to profile
              </Link>
            </div>
          </form>
        ) : (
          <p className="text-sm text-ink/70">No companies have been registered yet.</p>
        )}
      </Card>
    </div>
  );
}
