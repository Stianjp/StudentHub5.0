import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser } from "@/lib/student";
import { StandForm } from "@/components/event/stand-form";

type StandPageProps = {
  params: Promise<{ eventId: string; companyId: string }>;
};

export default async function StandPage({ params }: StandPageProps) {
  const { eventId, companyId } = await params;
  const supabase = await createServerSupabaseClient();

  const [{ data: event, error: eventError }, { data: company, error: companyError }] =
    await Promise.all([
      supabase.from("events").select("*").eq("id", eventId).single(),
      supabase.from("companies").select("*").eq("id", companyId).single(),
    ]);

  if (eventError || !event) throw eventError ?? new Error("Event not found");
  if (companyError || !company) throw companyError ?? new Error("Company not found");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
    : { data: null };

  const isStudent = profile.data?.role === "student" || profile.data?.role === "admin";
  const student = user && isStudent ? await getOrCreateStudentForUser(user.id, user.email) : null;

  const signInHref = `/auth/sign-in?role=student&next=${encodeURIComponent(`/event/${eventId}/company/${companyId}`)}`;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <SectionHeader
        eyebrow="Stand-QR"
        title={company.name}
        description={`Event: ${event.name}`}
      />

      <Card className="flex flex-col gap-2 text-sm text-ink/80">
        <p className="font-semibold text-primary">Hva skjer nå?</p>
        <p>Bekreft standbesøket ditt og velg om du vil bli kontaktet.</p>
        <p className="text-xs text-ink/70">Kontaktinfo deles kun ved eksplisitt samtykke.</p>
      </Card>

      {!student ? (
        <Card className="flex flex-col gap-4">
          <p className="text-sm text-ink/90">Du må være logget inn som student for å gi samtykke.</p>
          <Link className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-surface" href={signInHref}>
            Logg inn som student
          </Link>
        </Card>
      ) : (
        <Card className="flex flex-col gap-4">
          <StandForm
            eventId={eventId}
            companyId={companyId}
            companyName={company.name}
            studentEmail={student?.email ?? user?.email ?? ""}
            studyLevel={student?.study_level}
            studyYear={student?.graduation_year}
            fieldOfStudy={student?.study_program}
          />
        </Card>
      )}
    </div>
  );
}
