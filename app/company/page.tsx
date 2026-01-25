import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Stat } from "@/components/ui/stat";
import { Textarea } from "@/components/ui/textarea";
import { requireRole } from "@/lib/auth";
import {
  getCompanyLeads,
  getCompanyRegistrations,
  getOrCreateCompanyForUser,
  getTopMatches,
} from "@/lib/company";
import { listActiveEvents } from "@/lib/events";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  saveCompanyBranding,
  saveCompanyInfo,
  saveCompanyRecruitment,
  signupForEvent,
} from "@/app/company/actions";

export default async function CompanyDashboardPage() {
  const profile = await requireRole("company");
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not found");
  }

  const company = await getOrCreateCompanyForUser(profile.id, user.email);
  const [registrations, leads, events] = await Promise.all([
    getCompanyRegistrations(company.id),
    getCompanyLeads(company.id),
    listActiveEvents(),
  ]);

  const latestEventId = registrations[0]?.event_id ?? null;
  const topMatches = await getTopMatches(company, latestEventId);

  const topScore = topMatches[0]?.score ?? 0;

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-6">
        <SectionHeader
          eyebrow="Dashboard"
          title="Bedriftsoversikt"
          description="Onboarding, eventpåmelding og innsikt i en enkel MVP-struktur."
        />
        <div className="grid gap-4 md:grid-cols-3">
          <Stat label="Event-deltakelser" value={registrations.length} hint="Antall events registrert" />
          <Stat label="Leads med samtykke" value={leads.length} hint="Kun consent=true" />
          <Stat label="Topp matchscore" value={`${topScore}%`} hint="Regelbasert matching" />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <SectionHeader title="1. Firma-info" description="Grunnleggende informasjon om bedriften." />
          <form action={saveCompanyInfo} className="grid gap-3">
            <label className="text-sm font-semibold text-primary">
              Firmanavn
              <Input name="name" defaultValue={company.name} required />
            </label>
            <label className="text-sm font-semibold text-primary">
              Organisasjonsnummer (valgfritt)
              <Input name="orgNumber" defaultValue={company.org_number ?? ""} />
            </label>
            <label className="text-sm font-semibold text-primary">
              Bransje
              <Input name="industry" defaultValue={company.industry ?? ""} />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm font-semibold text-primary">
                Størrelse
                <Input name="size" defaultValue={company.size ?? ""} placeholder="f.eks. 50-200" />
              </label>
              <label className="text-sm font-semibold text-primary">
                Lokasjon
                <Input name="location" defaultValue={company.location ?? ""} />
              </label>
            </div>
            <label className="text-sm font-semibold text-primary">
              Nettside
              <Input name="website" defaultValue={company.website ?? ""} placeholder="https://" />
            </label>
            <Button type="submit" className="mt-2 w-full">
              Lagre firma-info
            </Button>
          </form>
        </Card>

        <Card className="flex flex-col gap-4">
          <SectionHeader
            title="2. Rekruttering"
            description="Kommaseparer tags: roller, studieretninger, nivå og timing."
          />
          <form action={saveCompanyRecruitment} className="grid gap-3">
            <label className="text-sm font-semibold text-primary">
              Roller
              <Input name="recruitmentRoles" defaultValue={company.recruitment_roles.join(", ")} />
            </label>
            <label className="text-sm font-semibold text-primary">
              Studieretninger / fagfelt
              <Input name="recruitmentFields" defaultValue={company.recruitment_fields.join(", ")} />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm font-semibold text-primary">
                Nivå
                <Input name="recruitmentLevels" defaultValue={company.recruitment_levels.join(", ")} />
              </label>
              <label className="text-sm font-semibold text-primary">
                Jobbtyper
                <Input name="recruitmentJobTypes" defaultValue={company.recruitment_job_types.join(", ")} />
              </label>
            </div>
            <label className="text-sm font-semibold text-primary">
              Tidspunkt
              <Input name="recruitmentTiming" defaultValue={company.recruitment_timing.join(", ")} />
            </label>
            <Button type="submit" variant="secondary" className="mt-2 w-full">
              Lagre rekrutteringsbehov
            </Button>
          </form>
        </Card>

        <Card className="flex flex-col gap-4">
          <SectionHeader
            title="3. Employer branding"
            description="Verdier og budskap som brukes i matching og event-visning."
          />
          <form action={saveCompanyBranding} className="grid gap-3">
            <label className="text-sm font-semibold text-primary">
              Verdier (tags)
              <Input name="brandingValues" defaultValue={company.branding_values.join(", ")} />
            </label>
            <label className="text-sm font-semibold text-primary">
              EVP (kort)
              <Textarea name="brandingEvp" defaultValue={company.branding_evp ?? ""} rows={3} />
            </label>
            <label className="text-sm font-semibold text-primary">
              Hva vil dere kommunisere?
              <Textarea name="brandingMessage" defaultValue={company.branding_message ?? ""} rows={4} />
            </label>
            <Button type="submit" className="mt-2 w-full">
              Lagre branding
            </Button>
          </form>
        </Card>

        <Card className="flex flex-col gap-4">
          <SectionHeader
            title="Meld dere på event"
            description="Velg event, standtype og KPI-er. Admin kan senere sette pakke."
          />
          <form action={signupForEvent} className="grid gap-3">
            <label className="text-sm font-semibold text-primary">
              Event
              <select
                className="mt-1 w-full rounded-xl border border-primary/10 bg-surface px-3 py-2 text-sm"
                name="eventId"
                required
                defaultValue={events[0]?.id}
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-primary">
              Standtype
              <Input name="standType" placeholder="Standard, Premium, etc." />
            </label>
            <label className="text-sm font-semibold text-primary">
              Mål
              <Input name="goals" placeholder="f.eks. Leads, synlighet" />
            </label>
            <label className="text-sm font-semibold text-primary">
              KPI-er
              <Input name="kpis" placeholder="f.eks. 100 besøk, 30 leads" />
            </label>
            <Button type="submit" variant="secondary" className="mt-2 w-full">
              Bekreft påmelding
            </Button>
          </form>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="flex flex-col gap-4">
          <SectionHeader
            title="Top matches"
            description="Regelbasert score. Strukturen er klar for AI senere."
          />
          <div className="grid gap-3">
            {topMatches.length === 0 ? (
              <p className="text-sm text-ink/70">Ingen studenter å matche enda.</p>
            ) : (
              topMatches.map((match) => (
                <div key={match.id} className="rounded-xl border border-primary/10 bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-primary">Student {match.student_id.slice(0, 6)}</p>
                    <p className="text-lg font-bold text-primary">{match.score}%</p>
                  </div>
                  <p className="mt-1 text-xs text-ink/70">Reasons lagret som JSON i databasen.</p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <SectionHeader title="Neste steg" description="MVP-notater og TODO-er." />
          <ul className="list-disc space-y-2 pl-5 text-sm text-ink/80">
            <li>Koble subdomener i Vercel og fjern host-override.</li>
            <li>Sett user_id på seed-data for ekte testbrukere.</li>
            <li>Flytt sensitive admin-oppgaver til service role / Edge Functions.</li>
            <li>Utvid matching med flere signaler og forklaringer.</li>
          </ul>
        </Card>
      </section>
    </div>
  );
}
