import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Textarea } from "@/components/ui/textarea";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser } from "@/lib/student";
import { saveStudentProfile } from "@/app/student/actions";
import { LikedCompanies } from "@/components/student/liked-companies";
import { SaveProfileButton } from "@/components/student/save-profile-button";
import { STUDY_CATEGORIES } from "@/components/event/study-categories";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StudentProfilePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const showSaved = params.saved === "1";
  const profile = await requireRole("student");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");

  const student = await getOrCreateStudentForUser(profile.id, user.email);

  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("id, name, industry")
    .order("name");

  if (companiesError) throw companiesError;

  return (
    <div className="flex flex-col gap-8 text-surface">
      <div className="rounded-3xl border border-surface/10 bg-primary/60 p-6 md:p-10">
        <SectionHeader
          eyebrow="Profil"
          title="Din studentprofil"
          description="Mobil-først profil som brukes i matching og eventflyt."
          tone="light"
        />

        <Card className="mt-8 flex flex-col gap-5 bg-primary/20 text-surface ring-1 ring-white/10">
          {showSaved ? (
            <div
              className="rounded-xl border border-success/40 bg-success/20 px-4 py-3 text-sm text-surface"
              aria-live="polite"
            >
              Profilen er lagret.
            </div>
          ) : null}
          <form action={saveStudentProfile} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-surface">
                Navn
                <Input name="fullName" required defaultValue={student.full_name ?? ""} />
              </label>
              <label className="text-sm font-semibold text-surface">
                E-post
                <Input name="email" type="email" required defaultValue={student.email ?? user.email ?? ""} />
              </label>
            </div>

            <label className="text-sm font-semibold text-surface">
              Telefon (valgfritt)
              <Input name="phone" defaultValue={student.phone ?? ""} />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm font-semibold text-surface md:col-span-2">
                Studie / program
                <Input name="studyProgram" required defaultValue={student.study_program ?? ""} />
              </label>
              <label className="text-sm font-semibold text-surface">
                Nivå
                <Input name="studyLevel" required defaultValue={student.study_level ?? ""} placeholder="Bachelor, Master" />
              </label>
            </div>

            <label className="text-sm font-semibold text-surface">
              Ferdigår
              <Input name="graduationYear" type="number" required defaultValue={student.graduation_year ?? 2027} />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-surface">
                Jobbønske (tags)
                <Input name="jobTypes" defaultValue={student.job_types.join(", ")} placeholder="Sommerjobb, Internship" />
              </label>
              <div className="text-sm font-semibold text-surface">
                Interesser (velg en eller flere)
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {STUDY_CATEGORIES.map((category) => (
                    <label
                      key={category}
                      className="flex items-center gap-2 rounded-xl border border-primary/10 bg-surface px-3 py-2 text-sm text-primary"
                    >
                      <input
                        type="checkbox"
                        name="interests"
                        value={category}
                        defaultChecked={student.interests.includes(category)}
                        className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                      />
                      <span className="font-semibold text-primary">{category}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-surface">
                Verdier hos arbeidsgiver (tags)
                <Input name="values" defaultValue={student.values.join(", ")} placeholder="Læring, Autonomi" />
              </label>
              <label className="text-sm font-semibold text-surface">
                Foretrukne lokasjoner (tags)
                <Input name="preferredLocations" defaultValue={student.preferred_locations.join(", ")} placeholder="Oslo, Bergen" />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-surface">
              <input
                className="h-4 w-4 rounded border-primary/20 text-primary focus:ring-primary"
                type="checkbox"
                name="willingToRelocate"
                defaultChecked={student.willing_to_relocate}
              />
              Jeg er villig til å flytte
            </label>

            <label className="text-sm font-semibold text-surface">
              Bedrifter jeg liker
              <LikedCompanies
                companies={(companies ?? []).map((company) => ({
                  id: company.id,
                  name: company.name,
                  industry: company.industry,
                }))}
                initialSelected={student.liked_company_ids ?? []}
              />
            </label>

            <label className="text-sm font-semibold text-surface">
              Kort om deg (MVP-felt)
              <Textarea
                name="about"
                rows={4}
                defaultValue={student.about ?? ""}
                placeholder="Eksempel: 3. års student i informatikk med erfaring fra frontend-prosjekter, liker å jobbe i team og er åpen for sommerjobb i Oslo."
              />
              <p className="mt-2 text-xs text-surface/70">
                Tips: Skriv kort om hva du studerer, hvilke teknologier/områder du kan, og hva du ser etter (sommerjobb, deltid, internship).
              </p>
            </label>

            <SaveProfileButton />
          </form>
        </Card>
      </div>
    </div>
  );
}
