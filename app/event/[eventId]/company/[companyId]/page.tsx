import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Textarea } from "@/components/ui/textarea";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { submitStandFlow } from "@/app/event/actions";
import { getOrCreateStudentForUser } from "@/lib/student";

type StandPageProps = {
  params: Promise<{ eventId: string; companyId: string }>;
};

export default async function StandPage({ params }: StandPageProps) {
  const { eventId, companyId } = await params;
  const supabase = createServerSupabaseClient();

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
          <form action={submitStandFlow} className="grid gap-3">
            <input type="hidden" name="eventId" value={eventId} readOnly />
            <input type="hidden" name="companyId" value={companyId} readOnly />
            <input type="hidden" name="scope" value="contact" readOnly />

            <label className="flex items-center gap-2 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">
              <input className="h-4 w-4" type="checkbox" name="consent" value="true" />
              Jeg vil bli kontaktet av {company.name}
            </label>

            <label className="text-sm font-semibold text-primary">
              Hva er du mest interessert i?
              <Input name="motivation" placeholder="F.eks. sommerjobb, tech stack, team" />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm font-semibold text-primary">
                Når passer det?
                <Input name="timing" placeholder="Sommer 2026" />
              </label>
              <label className="text-sm font-semibold text-primary">
                Viktigste ferdigheter
                <Input name="skills" placeholder="React, analyse, strategi" />
              </label>
            </div>

            <label className="text-sm font-semibold text-primary">
              Frivillig kommentar
              <Textarea name="note" rows={3} placeholder="Lagres ikke ennå. TODO." />
            </label>

            <Button type="submit" className="mt-2 w-full">
              Send inn
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
