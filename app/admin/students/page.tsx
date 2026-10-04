import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeSchoolName } from "@/lib/school";
import { getStudentAudienceLabel } from "@/lib/portal-audience";
import { cn } from "@/lib/utils";

const STUDENT_COUNT_FORMATTER = new Intl.NumberFormat("nb-NO");

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type StatsView = "study-programs" | "schools" | "schools-study-programs";

type StudentStatsRow = {
  school: string | null;
  study_program: string | null;
};

const PAGE_SIZE = 20;

function formatCount(value: number) {
  return STUDENT_COUNT_FORMATTER.format(value);
}

function normalizeLabel(value: string | null, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function countByLabel(rows: StudentStatsRow[], getLabel: (row: StudentStatsRow) => string) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const label = getLabel(row);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => a.label.localeCompare(b.label, "nb-NO"));
}

function buildSchoolStudyProgramStats(rows: StudentStatsRow[]) {
  const schoolMap = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const school = normalizeLabel(normalizeSchoolName(row.school), "Ikke oppgitt studiested");
    const studyProgram = normalizeLabel(row.study_program, "Ikke oppgitt studieretning");
    const programMap = schoolMap.get(school) ?? new Map<string, number>();
    programMap.set(studyProgram, (programMap.get(studyProgram) ?? 0) + 1);
    schoolMap.set(school, programMap);
  }

  return [...schoolMap.entries()]
    .map(([school, programMap]) => ({
      school,
      total: [...programMap.values()].reduce((sum, count) => sum + count, 0),
      programs: [...programMap.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => a.label.localeCompare(b.label, "nb-NO")),
    }))
    .sort((a, b) => a.school.localeCompare(b.school, "nb-NO"));
}

function audienceFilter(value: string | string[] | undefined) {
  return value === "student" || value === "young_professional" ? value : "all";
}

function statsLink(view: StatsView, query: string, sort: string, audience: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("sort", sort);
  params.set("dir", "asc");
  params.set("view", view);
  if (audience !== "all") params.set("audience", audience);
  return `?${params.toString()}`;
}

export default async function AdminStudentsPage({ searchParams }: PageProps) {
  await requireRole("admin");
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const sort = typeof params.sort === "string" ? params.sort : "name";
  const view: StatsView =
    params.view === "schools" || params.view === "schools-study-programs"
      ? params.view
      : "study-programs";
  const dir = "asc";
  const audience = audienceFilter(params.audience);
  const page = Math.max(1, Number(params.page ?? "1"));

  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient() as unknown as typeof supabase;
  } catch {
    // fall back
  }

  let baseQuery = supabase.from("students").select("id, full_name, email, audience, school, study_program, study_level, study_year, graduation_year", { count: "exact" });

  if (query) {
    baseQuery = baseQuery.or(`full_name.ilike.%${query}%,email.ilike.%${query}%,school.ilike.%${query}%,study_program.ilike.%${query}%`);
  }
  if (audience !== "all") {
    baseQuery = baseQuery.eq("audience", audience);
  }

  const orderColumn = sort === "email" ? "email" : "full_name";
  const [studentsResult, totalResult, statsResult] = await Promise.all([
    baseQuery.order(orderColumn, { ascending: true }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("students").select("school, study_program, audience").range(0, 9999),
  ]);

  if (studentsResult.error) throw studentsResult.error;
  if (totalResult.error) throw totalResult.error;
  if (statsResult.error) throw statsResult.error;

  const typedStudents = (studentsResult.data ?? []) as unknown as Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    audience: "student" | "young_professional";
    school: string | null;
    study_program: string | null;
    study_level: string | null;
    study_year: number | null;
    graduation_year: number | null;
  }>;

  const allStatsRows = (statsResult.data ?? []) as Array<StudentStatsRow & { audience?: "student" | "young_professional" | null }>;
  const statsRows = audience === "all" ? allStatsRows : allStatsRows.filter((row) => row.audience === audience);
  const studentAudienceCount = allStatsRows.filter((row) => (row.audience ?? "student") === "student").length;
  const youngProfessionalCount = allStatsRows.filter((row) => row.audience === "young_professional").length;
  const studyProgramStats = countByLabel(statsRows, (row) => normalizeLabel(row.study_program, "Ikke oppgitt studieretning"));
  const schoolStats = countByLabel(statsRows, (row) => normalizeLabel(normalizeSchoolName(row.school), "Ikke oppgitt studiested"));
  const schoolStudyProgramStats = buildSchoolStudyProgramStats(statsRows);

  const totalStudents = totalResult.count ?? statsRows.length;
  const totalPages = Math.max(1, Math.ceil((studentsResult.count ?? 0) / PAGE_SIZE));
  const currentResultCount = studentsResult.count ?? 0;
  const statsCards = view === "schools" ? schoolStats : studyProgramStats;
  const statsTitle = view === "schools" ? "Studiesteder" : view === "schools-study-programs" ? "Studieretninger per skole" : "Studieretninger";
  const statsEmptyText = view === "schools" ? "Ingen studiesteder er registrert enda." : "Ingen studieretninger er registrert enda.";

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
          <p className="mt-1 text-sm text-ink/70">Personer er registrert på Oslo Student Hub.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-primary/10">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary/60">Students</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-primary">{formatCount(studentAudienceCount)}</p>
            </div>
            <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-primary/10">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary/60">Young Professionals</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-primary">{formatCount(youngProfessionalCount)}</p>
            </div>
          </div>
        </Card>

        <nav aria-label="Velg studentstatistikk" className="flex flex-wrap gap-2">
          {[
            ["study-programs", "Studieretninger"],
            ["schools", "Studiesteder"],
            ["schools-study-programs", "Studieretninger per skole"],
          ].map(([viewValue, label]) => {
            const active = view === viewValue;
            return (
              <Link
                key={viewValue}
                href={statsLink(viewValue as StatsView, query, sort, audience)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-bold transition-[background-color,border-color,color,box-shadow,transform] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-mist",
                  active
                    ? "border-primary bg-primary text-surface shadow-soft"
                    : "border-primary/20 bg-surface text-primary hover:border-secondary hover:bg-secondary/15",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="grid gap-2">
          <h3 className="text-base font-bold text-primary">{statsTitle}</h3>
          {view === "schools-study-programs" ? (
            schoolStudyProgramStats.length > 0 ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {schoolStudyProgramStats.map((school) => (
                  <Card key={school.school} className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-bold text-primary">{school.school}</p>
                      <span className="rounded-full bg-secondary/20 px-3 py-1 text-xs font-bold tabular-nums text-primary">
                        {formatCount(school.total)} studenter
                      </span>
                    </div>
                    <ul className="mt-3 grid gap-2">
                      {school.programs.map((program) => (
                        <li key={program.label} className="flex items-center justify-between gap-3 rounded-xl bg-primary/5 px-3 py-2 text-sm">
                          <span className="min-w-0 break-words font-semibold text-primary">{program.label}</span>
                          <span className="shrink-0 font-black tabular-nums text-primary">{formatCount(program.count)}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-3 sm:p-4">
                <p className="text-sm text-ink/70">Ingen skole- eller studiedata er registrert enda.</p>
              </Card>
            )
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {statsCards.length > 0 ? (
                statsCards.map((item) => (
                  <Card key={item.label} className="p-3 sm:p-4">
                    <p className="line-clamp-2 min-h-10 text-sm font-semibold text-primary">{item.label}</p>
                    <p className="mt-2 text-2xl font-black tabular-nums text-primary">{formatCount(item.count)}</p>
                  </Card>
                ))
              ) : (
                <Card className="p-3 sm:p-4">
                  <p className="text-sm text-ink/70">{statsEmptyText}</p>
                </Card>
              )}
            </div>
          )}
        </div>
      </section>

      <Card className="flex flex-col gap-4">
        <form className="grid gap-3 md:grid-cols-4" method="get">
          <input type="hidden" name="dir" value={dir} />
          <input type="hidden" name="view" value={view} />
          <label className="text-sm font-semibold text-primary">
            Målgruppe
            <Select name="audience" defaultValue={audience}>
              <option value="all">Alle</option>
              <option value="student">Students</option>
              <option value="young_professional">Young Professionals</option>
            </Select>
          </label>
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Søk
            <Input name="q" defaultValue={query} placeholder="Navn, e-post, skole eller studie…" />
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
              <th className="px-4 py-3">Målgruppe</th>
              <th className="px-4 py-3">Studiested</th>
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
                  <td className="px-4 py-3 text-ink/80">{getStudentAudienceLabel(student.audience)}</td>
                  <td className="px-4 py-3 text-ink/80">{student.school ?? "—"}</td>
                  <td className="px-4 py-3 text-ink/80">{student.study_program ?? "—"}</td>
                  <td className="px-4 py-3 text-ink/80">{student.study_level ?? "—"}</td>
                  <td className="px-4 py-3 text-ink/80">{student.study_year ?? student.graduation_year ?? "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-sm text-ink/70" colSpan={7}>
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
            <a className="rounded-full border border-primary/20 px-3 py-2 font-semibold hover:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary" href={`?q=${encodeURIComponent(query)}&sort=${sort}&dir=${dir}&view=${view}&audience=${audience}&page=${page - 1}`}>
              Forrige
            </a>
          ) : null}
          {page < totalPages ? (
            <a className="rounded-full border border-primary/20 px-3 py-2 font-semibold hover:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary" href={`?q=${encodeURIComponent(query)}&sort=${sort}&dir=${dir}&view=${view}&audience=${audience}&page=${page + 1}`}>
              Neste
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
