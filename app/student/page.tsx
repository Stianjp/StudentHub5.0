import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LikedCompanies } from "@/components/student/liked-companies";
import { SaveProfileButton } from "@/components/student/save-profile-button";
import { saveStudentProfile } from "@/app/student/actions";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser } from "@/lib/student";

const INTEREST_OPTIONS = [
  "Teknologi",
  "Økonomi",
  "Konsulent",
  "Markedsføring",
  "Salg",
  "HR",
  "Design",
  "Produkt",
];

const TEAM_SIZE_OPTIONS = ["1-5", "6-20", "21-50", "50+"];

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export default async function StudentProfilePage({ searchParams }: PageProps) {
  const paramsData = (await (searchParams ?? Promise.resolve({}))) as Record<
    string,
    string | string[] | undefined
  >;
  const saved = paramsData.saved === "1";
  const errorMessage = typeof paramsData.error === "string" ? paramsData.error : "";

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

  const interestSet = new Set((student.interests ?? []).map(normalize));
  const customInterests = (student.interests ?? []).filter(
    (interest) => !INTEREST_OPTIONS.some((option) => normalize(option) === normalize(interest)),
  );
  const selectedStudyTrack =
    student.study_level && student.study_year ? `${student.study_level}-${student.study_year}` : "";

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Student"
        title="Profil"
        description="Oppdater profilen din for bedre matching mot bedrifter og eventer."
      />

      {saved ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">
          Profil oppdatert.
        </Card>
      ) : null}
      {errorMessage ? (
        <Card className="border border-error/30 bg-error/10 text-sm text-error">
          {decodeURIComponent(errorMessage)}
        </Card>
      ) : null}

      <Card className="flex flex-col gap-5">
        <form action={saveStudentProfile} className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-primary">
            Navn
            <Input
              name="fullName"
              required
              autoComplete="name"
              defaultValue={student.full_name ?? ""}
              placeholder="Fornavn Etternavn"
            />
          </label>
          <label className="text-sm font-semibold text-primary">
            E-post
            <Input
              name="email"
              type="email"
              required
              autoComplete="email"
              spellCheck={false}
              defaultValue={student.email ?? user.email ?? ""}
              placeholder="navn@epost.no"
            />
          </label>
          <label className="text-sm font-semibold text-primary">
            Telefon
            <Input
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={student.phone ?? ""}
              placeholder="Telefonnummer"
            />
          </label>
          <label className="text-sm font-semibold text-primary">
            Studieprogram
            <Input
              name="studyProgram"
              required
              defaultValue={student.study_program ?? ""}
              placeholder="F.eks. Informatikk"
            />
          </label>
          <label className="text-sm font-semibold text-primary">
            Studienivå og år
            <Select name="studyTrack" required defaultValue={selectedStudyTrack}>
              <option value="">Velg</option>
              <option value="Bachelor-1">Bachelor 1. år</option>
              <option value="Bachelor-2">Bachelor 2. år</option>
              <option value="Bachelor-3">Bachelor 3. år</option>
              <option value="Master-1">Master 1. år</option>
              <option value="Master-2">Master 2. år</option>
              <option value="Master-3">Master 3. år</option>
              <option value="Master-4">Master 4. år</option>
              <option value="Master-5">Master 5. år</option>
            </Select>
          </label>
          <label className="text-sm font-semibold text-primary">
            Jobbtyper (kommaseparert)
            <Input
              name="jobTypes"
              defaultValue={(student.job_types ?? []).join(", ")}
              placeholder="Fast jobb, Sommerjobb, Deltidsjobb"
            />
          </label>

          <div className="grid gap-2 md:col-span-2">
            <p className="text-sm font-semibold text-primary">Interesser</p>
            <div className="grid gap-2 md:grid-cols-2">
              {INTEREST_OPTIONS.map((option) => (
                <label key={option} className="flex items-center gap-2 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2 text-sm text-ink/90">
                  <input
                    type="checkbox"
                    name="interests"
                    value={option}
                    defaultChecked={interestSet.has(normalize(option))}
                    className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                  />
                  {option}
                </label>
              ))}
            </div>
            <label className="text-sm font-semibold text-primary">
              Andre interesser (kommaseparert)
              <Input
                name="interests"
                defaultValue={customInterests.join(", ")}
                placeholder="F.eks. Dataanalyse, AI"
              />
            </label>
          </div>

          <label className="text-sm font-semibold text-primary">
            Verdier (kommaseparert)
            <Input name="values" defaultValue={(student.values ?? []).join(", ")} placeholder="F.eks. Bærekraft, Læring" />
          </label>
          <label className="text-sm font-semibold text-primary">
            Foretrukne lokasjoner (kommaseparert)
            <Input
              name="preferredLocations"
              defaultValue={(student.preferred_locations ?? []).join(", ")}
              placeholder="Oslo, Trondheim, Bergen"
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary md:col-span-2">
            <input
              type="checkbox"
              name="willingToRelocate"
              defaultChecked={Boolean(student.willing_to_relocate)}
              className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
            />
            Jeg er villig til å flytte for jobb
          </label>

          <label className="text-sm font-semibold text-primary md:col-span-2">
            Om meg
            <Textarea
              name="about"
              rows={5}
              maxLength={600}
              defaultValue={student.about ?? ""}
              placeholder="Kort om bakgrunn, motivasjon og hva du ønsker å jobbe med."
            />
          </label>

          <label className="text-sm font-semibold text-primary">
            Foretrukket arbeidsstil
            <Input
              name="workStyle"
              defaultValue={student.work_style ?? ""}
              placeholder="F.eks. Hybrid, team-fokus, selvstendig"
            />
          </label>
          <label className="text-sm font-semibold text-primary">
            Sosial profil (LinkedIn/GitHub/portfolio)
            <Input
              name="socialProfile"
              type="url"
              inputMode="url"
              autoComplete="url"
              spellCheck={false}
              defaultValue={student.social_profile ?? ""}
              placeholder="https://…"
            />
          </label>
          <label className="text-sm font-semibold text-primary">
            Foretrukket teamstørrelse
            <Select name="teamSize" defaultValue={student.team_size ?? ""}>
              <option value="">Velg</option>
              {TEAM_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </label>

          <div className="flex flex-col gap-2 md:col-span-2">
            <p className="text-sm font-semibold text-primary">Favorittbedrifter</p>
            <LikedCompanies
              companies={companies ?? []}
              initialSelected={student.liked_company_ids ?? []}
            />
          </div>

          <div className="md:col-span-2">
            <SaveProfileButton />
          </div>
        </form>
      </Card>
    </div>
  );
}
