import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const STUDENT_COUNT_FORMATTER = new Intl.NumberFormat("nb-NO");

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const PAGE_SIZE = 20;

function formatCount(value: number) {
  return STUDENT_COUNT_FORMATTER.format(value);
}

function normalizeStudyProgram(value: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "Ikke oppgitt";
}

export default async function AdminStudentsPage({ searchParams }: PageProps) {
  await requireRole("admin");
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const sort = typeof params.sort === "string" ? params.sort : "name";
  const dir = "asc";
  const page = Math.max(1, Number(params.page ?? "1"));

  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient() as unknown as typeof supabase;
  } catch {
    // fall back
  }

  let baseQuery = supabase.from("students").select("id, full_name, email, study_program, study_level, study_year, graduation_year", { count: "exact" });

  if (query) {
    baseQuery = baseQuery.or(`full_name.ilike.%${query}%,email.ilike.%${query}%,study_program.ilike.%${query}%`);
  }

  const orderColumn = sort === "email" ? "email" : "full_name";
  const [studentsResult, totalResult, studyProgramsResult] = await Promise.all([
    baseQuery.order(orderColumn, { ascending: true }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("students").select("study_program").range(0, 9999),
  ]);

  if (studentsResult.error) throw studentsResult.error;
  if (totalResult.error) throw totalResult.error;
  if (studyProgramsResult.error) throw studyProgramsResult.error;

  const typedStudents = (studentsResult.data ?? []) as unknown as Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    study_program: string | null;
    study_level: string | null;
    study_year: number | null;
    graduation_year: number | null;
  }>;

  const studyProgramCounts = new Map<string, number>();
  for (const row of (studyProgramsResult.data ?? []) as Array<{ study_program: string | null }>) {
    const label = normalizeStudyProgram(row.study_program);
    studyProgramCounts.set(label, (studyProgramCounts.get(label) ?? 0) + 1);
  }

  const studyProgramStats = [...studyProgramCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => a.label.localeCompare(b.label, "nb-NO"));

  const totalStudents = totalResult.count ?? studyProgramStats.reduce((sum, item) => sum + item.count, 0);
  const totalPages = Math.max(1, Math.ceil((studentsResult.count ?? 0) / PAGE_SIZE));
  const currentResultCount = studentsResult.count ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Studenter"
        title="Studentoversikt"
        description="Søk og sorter studenter. Bruk listen til kvalitetssikring og matching. Listen vises alfabetisk fra A til Å."
      />

      <section aria-labelledby="student-statistikk" className="grid gap-3">
        <h2 id="student-statistikk" className="sr-only">
          Studentstatistikk
        </h2>
        <Card className="border border-secondary/30 bg-secondary/10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/70">Totalt registrert</p>
          <p className="mt-2 text-4xl font-black tabular-nums text-primary">{formatCount(totalStudents)}</p>
          <p className="mt-1 text-sm text-ink/70">Studenter er registrert på Oslo Student Hub.</p>
        </Card>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {studyProgramStats.length > 0 ? (
            studyProgramStats.map((item) => (
              <Card key={item.label} className="p-3 sm:p-4">
                <p className="line-clamp-2 min-h-10 text-sm font-semibold text-primary">{item.label}</p>
                <p className="mt-2 text-2xl font-black tabular-nums text-primary">{formatCount(item.count)}</p>
              </Card>
            ))
          ) : (
            <Card className="p-3 sm:p-4">
              <p className="text-sm text-ink/70">Ingen studieretninger er registrert enda.</p>
            </Card>
          )}
        </div>
      </section>

      <Card className="flex flex-col gap-4">
        <form className="grid gap-3 md:grid-cols-3" method="get">
          <input type="hidden" name="dir" value={dir} />
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Søk
            <Input name="q" defaultValue={query} placeholder="Navn, e-post eller studie…" />
          </label>
          <label className="text-sm font-semibold text-primary">
            Sortering
            <Select name="sort" defaultValue={sort}>
              <option value="name">Navn A–Å</option>
              <option value="email">E-post A–Å</option>
            </Select>
          </label>
          <div className="md:col-span-3">
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
            {typedStudents.length > 0 ? (
              typedStudents.map((student) => (
                <tr key={student.id}>
                  <td className="px-4 py-3 font-semibold text-primary">
                    <Link className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary" href={`/admin/students/${student.id}`}>
                      {student.full_name ?? "Ukjent"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink/80">{student.email ?? "—"}</td>
                  <td className="px-4 py-3 text-ink/80">{student.study_program ?? "—"}</td>
                  <td className="px-4 py-3 text-ink/80">{student.study_level ?? "—"}</td>
                  <td className="px-4 py-3 text-ink/80">{student.study_year ?? student.graduation_year ?? "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-sm text-ink/70" colSpan={5}>
                  Ingen studenter matcher søket.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <div className="flex flex-col items-start justify-between gap-3 text-sm text-ink/70 sm:flex-row sm:items-center">
        <span>Side {page} av {totalPages} · {formatCount(currentResultCount)} treff</span>
        <div className="flex gap-2">
          {page > 1 ? (
            <a className="rounded-full border border-primary/20 px-3 py-2 font-semibold hover:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary" href={`?q=${encodeURIComponent(query)}&sort=${sort}&dir=${dir}&page=${page - 1}`}>
              Forrige
            </a>
          ) : null}
          {page < totalPages ? (
            <a className="rounded-full border border-primary/20 px-3 py-2 font-semibold hover:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary" href={`?q=${encodeURIComponent(query)}&sort=${sort}&dir=${dir}&page=${page + 1}`}>
              Neste
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
