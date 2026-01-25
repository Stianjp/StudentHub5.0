import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Textarea } from "@/components/ui/textarea";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser } from "@/lib/student";
import { saveStudentProfile } from "@/app/student/actions";
import { LikedCompanies } from "@/components/student/liked-companies";

export default async function StudentProfilePage() {
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
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Profil"
        title="Din studentprofil"
        description="Mobil-først profil som brukes i matching og eventflyt."
      />

      <Card className="flex flex-col gap-5">
        <form action={saveStudentProfile} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-primary">
              Navn
              <Input name="fullName" required defaultValue={student.full_name ?? ""} />
            </label>
            <label className="text-sm font-semibold text-primary">
              E-post
              <Input name="email" type="email" required defaultValue={student.email ?? user.email ?? ""} />
            </label>
          </div>

          <label className="text-sm font-semibold text-primary">
            Telefon (valgfritt)
            <Input name="phone" defaultValue={student.phone ?? ""} />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm font-semibold text-primary md:col-span-2">
              Studie / program
              <Input name="studyProgram" required defaultValue={student.study_program ?? ""} />
            </label>
            <label className="text-sm font-semibold text-primary">
              Nivå
              <Input name="studyLevel" required defaultValue={student.study_level ?? ""} placeholder="Bachelor, Master" />
            </label>
          </div>

          <label className="text-sm font-semibold text-primary">
            Ferdigår
            <Input name="graduationYear" type="number" required defaultValue={student.graduation_year ?? 2027} />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-primary">
              Jobbønske (tags)
              <Input name="jobTypes" defaultValue={student.job_types.join(", ")} placeholder="Sommerjobb, Internship" />
            </label>
            <label className="text-sm font-semibold text-primary">
              Interesser (tags)
              <Input name="interests" defaultValue={student.interests.join(", ")} placeholder="Frontend, Analyse" />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-primary">
              Verdier hos arbeidsgiver (tags)
              <Input name="values" defaultValue={student.values.join(", ")} placeholder="Læring, Autonomi" />
            </label>
            <label className="text-sm font-semibold text-primary">
              Foretrukne lokasjoner (tags)
              <Input name="preferredLocations" defaultValue={student.preferred_locations.join(", ")} placeholder="Oslo, Bergen" />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold text-primary">
            <input
              className="h-4 w-4 rounded border-primary/20 text-primary focus:ring-primary"
              type="checkbox"
              name="willingToRelocate"
              defaultChecked={student.willing_to_relocate}
            />
            Jeg er villig til å flytte
          </label>

          <label className="text-sm font-semibold text-primary">
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

          <label className="text-sm font-semibold text-primary">
            Kort om deg (MVP-felt)
            <Textarea name="about" rows={3} placeholder="Dette feltet lagres ikke ennå. TODO." />
          </label>

          <Button className="mt-2 w-full" type="submit">
            Lagre profil
          </Button>
        </form>
      </Card>
    </div>
  );
}
