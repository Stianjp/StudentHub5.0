import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listCompanies } from "@/lib/admin";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminCompaniesOverviewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const companies = await listCompanies();

  const query = typeof params.q === "string" ? params.q.toLowerCase() : "";
  const sort = typeof params.sort === "string" ? params.sort : "name";
  const dir = params.dir === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(params.page ?? "1"));
  const pageSize = 20;

  const filteredCompanies = companies.filter((company) =>
    query.length === 0 ? true : company.name.toLowerCase().includes(query),
  );

  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    const aValue = sort === "industry" ? a.industry ?? "" : a.name;
    const bValue = sort === "industry" ? b.industry ?? "" : b.name;
    return dir === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
  });

  const totalPages = Math.max(1, Math.ceil(sortedCompanies.length / pageSize));
  const pagedCompanies = sortedCompanies.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Bedrifter"
        title="Oversikt bedrifter"
        description="Alle bedrifter, med søk og sortering."
        actions={<Link className="button-link text-xs" href="/admin/companies/register">Registrer bedrift</Link>}
      />

      <Card className="flex flex-col gap-3">
        <h3 className="text-lg font-bold text-primary">Søk i bedrifter</h3>
        <form className="grid gap-3 md:grid-cols-4" method="get">
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Søk
            <Input name="q" defaultValue={query} placeholder="Søk på bedriftsnavn" />
          </label>
          <label className="text-sm font-semibold text-primary">
            Sortering
            <Select name="sort" defaultValue={sort}>
              <option value="name">Navn</option>
              <option value="industry">Bransje</option>
            </Select>
          </label>
          <label className="text-sm font-semibold text-primary">
            Rekkefølge
            <Select name="dir" defaultValue={dir}>
              <option value="asc">A–Å</option>
              <option value="desc">Å–A</option>
            </Select>
          </label>
          <Button variant="secondary" type="submit" className="md:col-span-4">
            Filtrer
          </Button>
        </form>
      </Card>

      <Card className="overflow-x-auto">
        <table className="min-w-full divide-y divide-primary/10 text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-primary/60">
              <th className="px-4 py-3">Bedrift</th>
              <th className="px-4 py-3">Org.nr</th>
              <th className="px-4 py-3">Bransje</th>
              <th className="px-4 py-3">Lokasjon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/5">
            {pagedCompanies.map((company) => (
              <tr key={`row-${company.id}`}>
                <td className="px-4 py-3 font-semibold text-primary">
                  <Link href={`/admin/companies/${company.id}`} className="hover:underline">
                    {company.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink/80">{company.org_number ?? "—"}</td>
                <td className="px-4 py-3 text-ink/80">{company.industry ?? "—"}</td>
                <td className="px-4 py-3 text-ink/80">{company.location ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="flex items-center justify-between text-sm text-ink/70">
        <span>Side {page} av {totalPages}</span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              className="rounded-full border border-primary/20 px-3 py-1"
              href={`?q=${encodeURIComponent(query)}&sort=${sort}&dir=${dir}&page=${page - 1}`}
            >
              Forrige
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              className="rounded-full border border-primary/20 px-3 py-1"
              href={`?q=${encodeURIComponent(query)}&sort=${sort}&dir=${dir}&page=${page + 1}`}
            >
              Neste
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
