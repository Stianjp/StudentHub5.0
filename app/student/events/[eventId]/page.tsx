import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Input } from "@/components/ui/input";
import { CompanyInterestSelector } from "@/components/event/company-interest-selector";
import { getEvent, getEventCompanies } from "@/lib/events";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser } from "@/lib/student";
import { requireRole } from "@/lib/auth";
import { registerStudentForEvent } from "@/app/event/actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type StudentTicket = {
  id: string;
  ticket_number: string;
  status: string;
  checked_in_at: string | null;
  created_at: string;
};

export default async function StudentEventSignupPage({ params, searchParams }: PageProps) {
  const { eventId } = await params;
  const paramsData = (await (searchParams ?? Promise.resolve({}))) as Record<
    string,
    string | string[] | undefined
  >;
  const saved = paramsData.saved === "1";
  const already = paramsData.already === "1";
  const errorMessage = typeof paramsData.error === "string" ? paramsData.error : "";

  const profile = await requireRole("student");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not found");

  const student = await getOrCreateStudentForUser(profile.id, user.email);
  const [event, registrations, { data: ticketRows }] = await Promise.all([
    getEvent(eventId),
    getEventCompanies(eventId),
    supabase
      .from("event_tickets")
      .select("id, ticket_number, status, checked_in_at, created_at")
      .eq("event_id", eventId)
      .eq("student_id", student.id)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  const existingTicket = ((ticketRows ?? [])[0] ?? null) as StudentTicket | null;
  const companyOptions = registrations.map((registration) => ({
    id: registration.company_id,
    name: registration.company.name,
  }));

  const needsName = !student.full_name;
  const needsEmail = !student.email && !user.email;
  const needsPhone = !student.phone;

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Student"
        title={event.name}
        description={event.description ?? "Påmelding til event"}
        actions={<Link className="button-link text-xs" href="/student/events">Tilbake</Link>}
      />

      {saved ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">
          Påmelding registrert.
        </Card>
      ) : null}
      {already || existingTicket ? (
        <Card className="border border-info/30 bg-info/10 text-sm text-info">
          Du har allerede billett til dette eventet.
        </Card>
      ) : null}
      {errorMessage ? (
        <Card className="border border-error/30 bg-error/10 text-sm text-error">
          {decodeURIComponent(errorMessage)}
        </Card>
      ) : null}

      {existingTicket ? (
        <Card className="flex flex-col gap-2 border border-success/30 bg-success/10">
          <h3 className="text-lg font-bold text-success">Din billett</h3>
          <p className="text-sm text-success">
            Billettnummer: <span className="font-semibold">{existingTicket.ticket_number}</span>
          </p>
          <p className="text-sm text-success">
            Status:{" "}
            <span className="font-semibold">
              {existingTicket.checked_in_at ? "Sjekket inn" : existingTicket.status}
            </span>
          </p>
          {existingTicket.checked_in_at ? (
            <p className="text-xs text-success/80">
              Innsjekket: {new Date(existingTicket.checked_in_at).toLocaleString("nb-NO")}
            </p>
          ) : null}
        </Card>
      ) : null}

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Meld deg på</h3>
        <form action={registerStudentForEvent} className="grid gap-3 md:grid-cols-3">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="returnTo" value={`/student/events/${eventId}?saved=1`} />
          {companyOptions.length > 0 ? <input type="hidden" name="requireCompany" value="1" /> : null}

          {needsName ? (
            <label className="text-sm font-semibold text-primary md:col-span-1">
              Navn
              <Input name="fullName" required placeholder="Fornavn Etternavn" />
            </label>
          ) : null}
          {needsEmail ? (
            <label className="text-sm font-semibold text-primary md:col-span-1">
              E-post
              <Input name="email" type="email" required placeholder="navn@epost.no" />
            </label>
          ) : null}
          {needsPhone ? (
            <label className="text-sm font-semibold text-primary md:col-span-1">
              Telefon
              <Input name="phone" required placeholder="Telefonnummer" />
            </label>
          ) : null}

          <div className="md:col-span-3">
            <p className="text-sm font-semibold text-primary">Hvilke bedrifter er du interessert i?</p>
            <p className="text-xs text-ink/60">Velg alle, noen eller ingen.</p>
            <div className="mt-2">
              <CompanyInterestSelector companies={companyOptions} required={companyOptions.length > 0} />
            </div>
          </div>

          <button
            type="submit"
            disabled={Boolean(existingTicket)}
            className="md:col-span-3 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-surface transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {existingTicket ? "Allerede påmeldt" : "Meld deg på"}
          </button>
        </form>
      </Card>
    </div>
  );
}
