import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { buildLeadOverview, readAllLeadOverviewRows, type LeadOverviewCompany, type LeadOverviewConsent } from "@/lib/lead-overview";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default async function LeadOverviewPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("admin");
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : "";
  const supabase = createAdminSupabaseClient();
  const [companies, consents] = await Promise.all([
    readAllLeadOverviewRows<LeadOverviewCompany>((from, to) => supabase.from("companies")
      .select("id, name, industry, recruitment_fields").order("id").range(from, to)),
    readAllLeadOverviewRows<LeadOverviewConsent>((from, to) => supabase.from("consents")
      .select("company_id, student_id, consent").eq("consent", true).order("id").range(from, to)),
  ]);
  const overview = buildLeadOverview(companies, consents);
  const categories = [...new Set(overview.flatMap((company) => company.categories))].sort((a, b) => a.localeCompare(b, "nb"));
  const filtered = category ? overview.filter((company) => company.categories.includes(category)) : overview;
  const number = new Intl.NumberFormat("nb-NO");

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader eyebrow="Leads" title="Oversikt" headingLevel="h1"
        description="Se hvilke bedrifter studentene er mest interessert i. Flest leads vises øverst." />
      <Card>
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 text-sm font-semibold text-primary">
          <label htmlFor="lead-category">
            Kategori
          </label>
            <Select id="lead-category" name="category" defaultValue={category}>
              <option value="">Alle kategorier</option>
              {category && !categories.includes(category) ? <option value={category}>{category}</option> : null}
              {categories.map((value) => <option key={value} value={value}>{value}</option>)}
            </Select>
          </div>
          <Button type="submit" variant="secondary">Filtrer</Button>
          {category ? <Link className="inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold text-primary underline" href="/admin/leads/overview">Nullstill</Link> : null}
        </form>
        <p className="mt-4 text-sm text-primary">
          Ett lead er én unik student med aktivt kontaktsamtykke til bedriften, inkludert favoritter fra studentportalen.
          Oversikten gjelder alle arrangementer samlet. Tilbaketrukne samtykker telles ikke.
        </p>
        <p className="mt-2 text-sm text-primary">Kategorier er bedriftenes fagområder for rekruttering, eller bransje dersom fagområder mangler.</p>
      </Card>
      <Card>
        <p className="mb-4 text-sm font-semibold text-primary">{number.format(filtered.length)} bedrifter{category ? ` innen ${category}` : " · alle kategorier"}</p>
        {filtered.length === 0 ? (
          <p className="text-sm text-primary">Ingen bedrifter å vise{category ? " i denne kategorien" : " ennå"}.</p>
        ) : (
          <table className="w-full table-fixed text-sm">
            <caption className="sr-only">Leads per bedrift, sortert fra flest til færrest{category ? ` innen ${category}` : ""}</caption>
            <thead><tr className="text-left">
              <th scope="col" className="px-3 py-3">Bedrift</th>
              <th scope="col" aria-sort="descending" className="w-20 px-3 py-3 text-right sm:w-28">Leads</th>
            </tr></thead>
            <tbody className="divide-y divide-primary/10">
              {filtered.map((company) => (
                <tr key={company.id}>
                  <th scope="row" className="break-words px-3 py-3 text-left font-normal">
                    <Link className="inline-flex min-h-11 items-center font-semibold text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary" href={`/admin/companies/${company.id}`}>{company.name}</Link>
                    <span className="block text-xs text-primary">{company.categories.join(" · ") || "Ingen kategori"}</span>
                  </th>
                  <td className="px-3 py-3 text-right text-lg font-bold tabular-nums">{number.format(company.leadCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
