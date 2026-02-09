import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser } from "@/lib/student";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

function calcProfileCompletion(student: any) {
  const fields = [
    student.full_name,
    student.email,
    student.phone,
    student.study_program,
    student.study_level,
    student.study_year,
    student.work_style,
    student.social_profile,
    student.team_size,
    student.about,
  ];
  const filled = fields.filter((value) => value !== null && value !== undefined && String(value).trim() !== "").length;
  return Math.round((filled / fields.length) * 100);
}

export default async function StudentDashboardPage() {
  const profile = await requireRole("student");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");

  const student = await getOrCreateStudentForUser(profile.id, user.email);
  const completion = calcProfileCompletion(student);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Student"
        title={`Hei ${student.full_name ?? ""}`.trim()}
        description="Få oversikt over profilen din og neste steg."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <h3 className="text-lg font-bold text-primary">Registreringsstatus</h3>
          <p className="text-4xl font-bold text-primary">{completion}%</p>
          <p className="text-sm text-ink/70">Fyll ut profilen for bedre matching.</p>
          <Link className="button-link text-xs" href="/student">
            Oppdater profil
          </Link>
        </Card>
        <Card className="flex flex-col gap-3">
          <h3 className="text-lg font-bold text-primary">Påmelding til event</h3>
          <p className="text-sm text-ink/70">Se alle events og meld deg på.</p>
          <Link className="button-link text-xs" href="/student/events">
            Åpne
          </Link>
        </Card>
      </div>
    </div>
  );
}
