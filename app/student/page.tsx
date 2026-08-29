import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LikedCompanies } from "@/components/student/liked-companies";
import { STUDY_CATEGORIES } from "@/components/event/study-categories";
import { SaveProfileButton } from "@/components/student/save-profile-button";
import { saveStudentProfile } from "@/app/student/actions";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser } from "@/lib/student";
import { getStudentCategoryLabel } from "@/lib/student-company-display";

const INTEREST_OPTIONS = [
  { value: "Teknologi", label: "Technology" },
  { value: "Økonomi", label: "Economics" },
  { value: "Konsulent", label: "Consulting" },
  { value: "Markedsføring", label: "Marketing" },
  { value: "Salg", label: "Sales" },
  { value: "HR", label: "HR" },
  { value: "Design", label: "Design" },
  { value: "Produkt", label: "Product" },
];

const TEAM_SIZE_OPTIONS = ["1-5", "6-20", "21-50", "50+"];

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

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
  const typedStudent = student as {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    school: string | null;
    study_program: string | null;
    study_level: string | null;
    study_year: number | null;
    graduation_year: number | null;
    interests: string[] | null;
    social_profile: string | null;
    work_style: string | null;
    team_size: string | null;
    liked_company_ids: string[] | null;
  };
  const interestSet = new Set((typedStudent.interests ?? []).map(normalize));
  const customInterests = (typedStudent.interests ?? []).filter(
    (interest) => !INTEREST_OPTIONS.some((option) => normalize(option.value) === normalize(interest)),
  );
  const selectedStudyTrack =
    typedStudent.study_level && typedStudent.study_year ? `${typedStudent.study_level}-${typedStudent.study_year}` : "";

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Student"
        title="Profile"
        description="Update your profile to get better matches with companies and events."
      />

      {saved ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">
          Profile updated.
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
            Name
            <Input
              name="fullName"
              required
              autoComplete="name"
              defaultValue={student.full_name ?? ""}
              placeholder="First name Last name"
            />
          </label>
          <label className="text-sm font-semibold text-primary">
            Email
            <Input
              name="email"
              type="email"
              required
              autoComplete="email"
              spellCheck={false}
              defaultValue={student.email ?? user.email ?? ""}
              placeholder="name@example.com"
            />
          </label>
          <label className="text-sm font-semibold text-primary">
            Phone
            <Input
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={student.phone ?? ""}
              placeholder="Phone number"
            />
          </label>
          <label className="text-sm font-semibold text-primary">
            University or educational institution
            <Input
              name="school"
              required
              defaultValue={typedStudent.school ?? ""}
              placeholder="For example, NTNU"
            />
          </label>
          <label className="text-sm font-semibold text-primary">
            Field of study
            <Select name="studyProgram" required defaultValue={student.study_program ?? ""}>
              <option value="">Select field of study</option>
              {STUDY_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {getStudentCategoryLabel(category)}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-semibold text-primary">
            Study level and year
            <Select name="studyTrack" required defaultValue={selectedStudyTrack}>
              <option value="">Select</option>
              <option value="Bachelor-1">Bachelor, year 1</option>
              <option value="Bachelor-2">Bachelor, year 2</option>
              <option value="Bachelor-3">Bachelor, year 3</option>
              <option value="Master-1">Master, year 1</option>
              <option value="Master-2">Master, year 2</option>
              <option value="Master-3">Master, year 3</option>
              <option value="Master-4">Master, year 4</option>
              <option value="Master-5">Master, year 5</option>
            </Select>
          </label>
          <label className="text-sm font-semibold text-primary">
            Job types (comma-separated)
            <Input
              name="jobTypes"
              defaultValue={(student.job_types ?? []).join(", ")}
              placeholder="Full-time job, summer internship, part-time job"
            />
          </label>

          <div className="grid gap-2 md:col-span-2">
            <p className="text-sm font-semibold text-primary">Interests</p>
            <div className="grid gap-2 md:grid-cols-2">
              {INTEREST_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2 text-sm text-ink/90">
                  <input
                    type="checkbox"
                    name="interests"
                    value={option.value}
                    defaultChecked={interestSet.has(normalize(option.value))}
                    className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <label className="text-sm font-semibold text-primary">
              Other interests (comma-separated)
              <Input
                name="interests"
                defaultValue={customInterests.join(", ")}
                placeholder="For example, data analysis, AI"
              />
            </label>
          </div>

          <label className="text-sm font-semibold text-primary">
            Values (comma-separated)
            <Input name="values" defaultValue={(student.values ?? []).join(", ")} placeholder="For example, sustainability, learning" />
          </label>
          <label className="text-sm font-semibold text-primary">
            Preferred locations (comma-separated)
            <Input
              name="preferredLocations"
              defaultValue={(student.preferred_locations ?? []).join(", ")}
              placeholder="Leave blank for no preference"
            />
            <span className="mt-1 block text-xs font-normal text-ink/65">
              Ignored if you indicate that you are willing to relocate for work.
            </span>
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary md:col-span-2">
            <input
              type="checkbox"
              name="willingToRelocate"
              defaultChecked={Boolean(student.willing_to_relocate)}
              className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
            />
            I am willing to relocate for work
          </label>

          <label className="text-sm font-semibold text-primary md:col-span-2">
            About me
            <Textarea
              name="about"
              rows={5}
              maxLength={600}
              defaultValue={student.about ?? ""}
              placeholder="A short introduction to your background, motivation and career interests."
            />
          </label>

          <label className="text-sm font-semibold text-primary">
            Preferred work style
            <Input
              name="workStyle"
              defaultValue={student.work_style ?? ""}
              placeholder="For example, hybrid, team-focused, independent"
            />
          </label>
          <label className="text-sm font-semibold text-primary">
            Social profile (LinkedIn/GitHub/portfolio)
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
            Preferred team size
            <Select name="teamSize" defaultValue={student.team_size ?? "__none__"}>
              <option value="__none__">No preference</option>
              {TEAM_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </label>

          <div className="flex flex-col gap-2 md:col-span-2">
            <p className="text-sm font-semibold text-primary">Favourite companies</p>
            <p className="text-xs text-ink/70">
              Adding a company to your favourites also gives it permission to contact you about relevant opportunities.
            </p>
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
