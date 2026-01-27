import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const PAGE_SIZE = 20;

export default async function AdminStudentsPage({ searchParams }: PageProps) {
  await requireRole("admin");
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const sort = typeof params.sort === "string" ? params.sort : "name";
  const dir = params.dir === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(params.page ?? "1"));

  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient();
  } catch {
    // fall back
  }

  let baseQuery = supabase.from("students").select("id, full_name, email, study_program, study_level, graduation_year", { count: "exact" });

  if (query) {
    baseQuery = baseQuery.or(`full_name.ilike.%${query}%,email.ilike.%${query}%,study_program.ilike.%${query}%`);
  }

  const orderColumn = sort === "email" ? "email" : "full_name";
  const { data: students, count, error } = await baseQuery
    .order(orderColumn, { ascending: dir === "asc" })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (error) throw error;

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Studenter"
        title="Studentoversikt"
        description="Søk og sorter studenter. Bruk listen til kvalitetssikring og matching."
      />

      <Card className="flex flex-col gap-4">
        <form className="grid gap-3 md:grid-cols-4" method="get">
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Søk
            <Input name="q" defaultValue={query} placeholder="Navn, e-post eller studie" />
          </label>
          <label className="text-sm font-semibold text-primary">
            Sortering
            <Select name="sort" defaultValue={sort}>
              <option value="name">Navn</option>
              <option value="email">E-post</option>
            </Select>
          </label>
          <label className="text-sm font-semibold text-primary">
            Rekkefølge
            <Select name="dir" defaultValue={dir}>
              <option value="asc">A–Å</option>
              <option value="desc">Å–A</option>
            </Select>
          </label>
          <div className="md:col-span-4">
            <Button variant="secondary" type="submit">Oppdater</Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-x-auto">
        <table className="min-w-full divide-y divide-primary/10 text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-primary/60">
              <th className="px-4 py-3">Navn</th>
              <th className="px-4 py-3">E-post</th>
              <th className="px-4 py-3">Studie</th>
              <th className="px-4 py-3">Nivå</th>
              <th className="px-4 py-3">Ferdigår</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/5">
            {(students ?? []).map((student) => (
              <tr key={student.id}>
                <td className="px-4 py-3 font-semibold text-primary">{student.full_name ?? "Ukjent"}</td>
                <td className="px-4 py-3 text-ink/80">{student.email ?? "—"}</td>
                <td className="px-4 py-3 text-ink/80">{student.study_program ?? "—"}</td>
                <td className="px-4 py-3 text-ink/80">{student.study_level ?? "—"}</td>
                <td className="px-4 py-3 text-ink/80">{student.graduation_year ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="flex items-center justify-between text-sm text-ink/70">
        <span>Side {page} av {totalPages}</span>
        <div className="flex gap-2">
          {page > 1 ? (
            <a className="rounded-full border border-primary/20 px-3 py-1" href={`?q=${encodeURIComponent(query)}&sort=${sort}&dir=${dir}&page=${page - 1}`}>
              Forrige
            </a>
          ) : null}
          {page < totalPages ? (
            <a className="rounded-full border border-primary/20 px-3 py-1" href={`?q=${encodeURIComponent(query)}&sort=${sort}&dir=${dir}&page=${page + 1}`}>
              Neste
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
