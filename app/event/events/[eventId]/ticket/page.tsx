import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { PublicStudentTicketForm } from "@/components/event/public-student-ticket-form";
import { getEvent, getEventCompanies } from "@/lib/events";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser } from "@/lib/student";

type TicketPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventTicketPage({ params }: TicketPageProps) {
  const { eventId } = await params;
  const supabase = await createServerSupabaseClient();
  const [
    event,
    registrations,
    {
      data: { user },
    },
  ] = await Promise.all([getEvent(eventId), getEventCompanies(eventId), supabase.auth.getUser()]);

  const { data: profile } = user
    ? await supabase.from("profiles").select("id, role").eq("id" as never, user.id as never).maybeSingle()
    : { data: null };
  const typedProfile = profile as { role?: string } | null;

  const student =
    user && typedProfile?.role === "student" ? await getOrCreateStudentForUser(user.id, user.email) : null;

  const companyOptions = registrations.map((registration) => ({
    id: registration.company_id,
    name: registration.company.name,
    industry: registration.company.industry ?? null,
  }));

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Event"
        title={`Studentregistrering for ${event.name}`}
        description="Én side for billett, studentprofil og valgfri kontoopprettelse."
        actions={
          <Link
            className="rounded-xl border border-primary/20 px-4 py-2 text-sm font-semibold text-primary"
            href={`/event/events/${eventId}`}
          >
            Tilbake til eventet
          </Link>
        }
      />

      <Card className="text-sm text-ink/75">
        Fyll ut skjemaet under for å sikre deg plass. Etter registrering får du billetten på e-post, og hvis du velger konto, sender vi også bekreftelse for innlogging.
      </Card>

      <PublicStudentTicketForm
        eventId={eventId}
        eventName={event.name}
        companies={companyOptions}
        initialValues={
          student
            ? {
                fullName: student.full_name,
                email: student.email ?? user?.email ?? null,
                phone: student.phone,
                school: student.school,
                studyProgram: student.study_program,
                studyLevel: student.study_level,
                studyYear: student.study_year,
                jobTypes: student.job_types,
                interests: student.interests,
                values: student.values,
                preferredLocations: student.preferred_locations,
                willingToRelocate: student.willing_to_relocate,
                about: student.about,
                workStyle: student.work_style,
                socialProfile: student.social_profile,
                teamSize: student.team_size,
                likedCompanyIds: student.liked_company_ids,
              }
            : null
        }
      />
    </div>
  );
}
