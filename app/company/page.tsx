import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Stat } from "@/components/ui/stat";
import { requireRole } from "@/lib/auth";
import { getCompanyLeads, getCompanyRegistrations, getOrCreateCompanyForUser } from "@/lib/company";
import { getCompanyOnboardingStatus } from "@/lib/company-onboarding";
import { listActiveEvents } from "@/lib/events";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function CompanyDashboardPage() {
  const profile = await requireRole("company");
  const supabase = await createServerSupabaseClient();
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
  const consentedLeads = leads.filter((lead) => lead.consent?.consent).length;

  const onboarding = getCompanyOnboardingStatus(company);

  return (
    <div className="flex flex-col gap-10">
      <SectionHeader
        eyebrow="Bedriftsdashboard"
        title={`Hei ${company.name}`}
        description="Her får du oversikt og neste steg. Registreringen er nå delt opp for å gjøre det enklere."
        actions={
          <Link href="/company/onboarding">
            <Button variant="secondary">Gå til registrering</Button>
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Stat label="Event-deltakelser" value={registrations.length} hint="Registrerte events" />
        <Stat label="Leads med samtykke" value={consentedLeads} hint="Kun consent=true" />
        <Stat label="Aktive events" value={events.length} hint="Tilgjengelige nå" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-primary">Registreringsstatus</h3>
            <span className="text-sm font-semibold text-primary/70">{onboarding.progress}% fullført</span>
          </div>
          <div className="h-3 w-full rounded-full bg-primary/10">
            <div className="h-3 rounded-full bg-secondary" style={{ width: `${onboarding.progress}%` }} />
          </div>
          <ul className="grid gap-2 text-sm text-ink/80">
            {onboarding.sections.map((section) => (
              <li key={section.key} className="flex items-center justify-between rounded-xl bg-primary/5 px-3 py-2">
                <span className="font-semibold text-primary">{section.label}</span>
                <span className={section.completed ? "text-success" : "text-warning"}>
                  {section.completed ? "Fullført" : "Mangler"}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/company/onboarding">
            <Button>Fortsett registrering</Button>
          </Link>
        </Card>

        <Card className="flex flex-col gap-4">
          <h3 className="text-lg font-bold text-primary">Hva skjer nå?</h3>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-ink/80">
            <li>Fullfør alle stegene i registreringen.</li>
            <li>Be OSH-teamet registrere dere på ønsket event.</li>
            <li>Admin setter pakke (Standard/Sølv/Gull/Platinum).</li>
            <li>Se leads og ROI i dashboardet.</li>
          </ol>
          <Link href="/company/events">
            <Button variant="secondary">Se eventpåmeldinger</Button>
          </Link>
        </Card>
      </section>
    </div>
  );
}
