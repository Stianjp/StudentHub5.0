import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { updateStudentConsent, updateStudentProfile, upsertStudentConsent } from "@/app/admin/students/actions";

type PageProps = {
  params: Promise<{ studentId: string }>;
};

export default async function AdminStudentDetailPage({ params }: PageProps) {
  await requireRole("admin");
  const { studentId } = await params;

  const supabase = createAdminSupabaseClient();

  const [{ data: student, error: studentError }, { data: consents }, { data: companies }, { data: events }] =
    await Promise.all([
      supabase
        .from("students")
        .select("id, full_name, email, study_program, study_level, graduation_year, interests")
        .eq("id", studentId)
        .single(),
      supabase
        .from("consents")
        .select("id, consent, consented_at, company:companies(id, name), event:events(id, name)")
        .eq("student_id", studentId)
        .order("consented_at", { ascending: false }),
      supabase.from("companies").select("id, name").order("name"),
      supabase.from("events").select("id, name").order("starts_at", { ascending: false }),
    ]);

  if (studentError) throw studentError;

  const typedConsents = (consents ?? []) as unknown as Array<{
    id: string;
    consent: boolean;
    consented_at: string;
    company: { id: string; name: string | null } | null;
    event: { id: string; name: string | null } | null;
  }>;
  const activeConsents = typedConsents.filter((consent) => consent.consent);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Student"
        title={student?.full_name ?? "Studentprofil"}
        description="Rediger studentdata og administrer samtykker."
        actions={
          <Link className="text-sm font-semibold text-primary/70 hover:text-primary" href="/admin/students">
            Tilbake til oversikt
          </Link>
        }
      />

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Studentprofil</h3>
        <form action={updateStudentProfile} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="studentId" value={studentId} />
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Navn
            <Input name="fullName" defaultValue={student?.full_name ?? ""} />
          </label>
          <label className="text-sm font-semibold text-primary">
            E-post
            <Input name="email" type="email" defaultValue={student?.email ?? ""} />
          </label>
          <label className="text-sm font-semibold text-primary">
            Ferdigår
            <Input name="graduationYear" type="number" defaultValue={student?.graduation_year ?? ""} />
          </label>
          <label className="text-sm font-semibold text-primary">
            Studie / program
            <Input name="studyProgram" defaultValue={student?.study_program ?? ""} />
          </label>
          <label className="text-sm font-semibold text-primary">
            Nivå
            <Input name="studyLevel" defaultValue={student?.study_level ?? ""} placeholder="Bachelor, Master" />
          </label>
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Ferdigheter (tags)
            <Input
              name="interests"
              defaultValue={(student?.interests ?? []).join(", ")}
              placeholder="Analyse, frontend, UX"
            />
          </label>
          <div className="md:col-span-2">
            <Button type="submit">Lagre endringer</Button>
          </div>
        </form>
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Legg til samtykke</h3>
        <form action={upsertStudentConsent} className="grid gap-3 md:grid-cols-4">
          <input type="hidden" name="studentId" value={studentId} />
          <label className="text-sm font-semibold text-primary">
            Bedrift
            <Select name="companyId" required>
              {(companies ?? []).map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-semibold text-primary">
            Event
            <Select name="eventId" required>
              {(events ?? []).map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-semibold text-primary">
            Status
            <Select name="consent" defaultValue="true">
              <option value="true">Gi samtykke</option>
              <option value="false">Fjern samtykke</option>
            </Select>
          </label>
          <div className="md:col-span-4">
            <Button type="submit">Lagre samtykke</Button>
          </div>
        </form>
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Samtykker</h3>
        {activeConsents.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen samtykker registrert.</p>
        ) : (
          <div className="grid gap-3">
            {activeConsents.map((consent) => (
              <div key={consent.id} className="rounded-xl border border-primary/10 bg-primary/5 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-primary">{consent.company?.name ?? "Bedrift"}</p>
                    <p className="text-xs text-ink/70">{consent.event?.name ?? "Event"}</p>
                  </div>
                  <Badge variant={consent.consent ? "success" : "warning"}>
                    {consent.consent ? "Samtykke" : "Fjernet"}
                  </Badge>
                </div>
                <form action={updateStudentConsent} className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
                  <input type="hidden" name="studentId" value={studentId} />
                  <input type="hidden" name="consentId" value={consent.id} />
                  <Select name="consent" defaultValue={consent.consent ? "true" : "false"}>
                    <option value="true">Gi samtykke</option>
                    <option value="false">Fjern samtykke</option>
                  </Select>
                  <Button variant="secondary" type="submit">
                    Oppdater
                  </Button>
                </form>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
