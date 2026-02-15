import Link from "next/link";
import Image from "next/image";
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
  const companyId = company?.id;
  if (!company || !companyId) {
    return (
      <Card className="border border-warning/30 bg-warning/10 text-sm text-ink/90">
        Bedriftskontoen din er ikke godkjent enda. En admin ma godkjenne tilgang for du kan se dashboardet.
      </Card>
    );
  }

  const [registrations, leads, events] = await Promise.all([
    getCompanyRegistrations(companyId),
    getCompanyLeads(companyId),
    listActiveEvents(),
  ]);
  const consentedLeads = leads.filter((lead) => lead.consent?.consent).length;

  const onboarding = getCompanyOnboardingStatus(company);

  return (
    <div className="flex flex-col gap-10">
      <SectionHeader
        eyebrow="Bedriftsdashboard"
        title={`Hei ${company.name}`}
        description="Her far du oversikt og neste steg. Registreringen er delt opp for a gjore det enklere."
        actions={
          <Link href="/company/onboarding">
            <Button variant="secondary">Ga til registrering</Button>
          </Link>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="relative overflow-hidden p-0 lg:col-span-2">
          <div className="relative aspect-[16/7] w-full">
            <Image
              src="/images/Event_People_talking.jpg"
              alt="Studenter og bedrifter i samtale pa event"
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-surface">
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Eventfokus</p>
              <h3 className="mt-1 text-xl font-bold">Bygg relasjoner med riktige kandidater</h3>
              <p className="mt-1 text-sm text-surface/80">
                Bruk dashboardet til a folge opp pameldinger, leads og neste aktiviteter.
              </p>
            </div>
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="relative overflow-hidden p-0">
            <div className="relative aspect-[4/3] w-full">
              <Image
                src="/images/event_people_talking_one_on_one.jpg"
                alt="En til en samtale mellom student og bedrift"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/75 to-transparent" />
              <p className="absolute bottom-3 left-3 text-xs font-semibold text-surface">1:1-dialog</p>
            </div>
          </Card>
          <Card className="relative overflow-hidden p-0">
            <div className="relative aspect-[4/3] w-full">
              <Image
                src="/images/BigStand.jpg"
                alt="Stand-omrade under arrangement"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/75 to-transparent" />
              <p className="absolute bottom-3 left-3 text-xs font-semibold text-surface">Profilering</p>
            </div>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Stat label="Event-deltakelser" value={registrations.length} hint="Registrerte events" href="/company/events" />
        <Stat label="Leads med samtykke" value={consentedLeads} hint="Kun consent=true" href="/company/leads" />
        <Stat label="Aktive events" value={events.length} hint="Tilgjengelige na" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-primary">Registreringsstatus</h3>
            <span className="text-sm font-semibold text-primary/70">{onboarding.progress}% fullfort</span>
          </div>
          <div className="h-3 w-full rounded-full bg-primary/10">
            <div className="h-3 rounded-full bg-secondary" style={{ width: `${onboarding.progress}%` }} />
          </div>
          <ul className="grid gap-2 text-sm text-ink/80">
            {onboarding.sections.map((section) => (
              <li key={section.key} className="flex items-center justify-between rounded-xl bg-primary/5 px-3 py-2">
                <span className="font-semibold text-primary">{section.label}</span>
                <span className={section.completed ? "text-success" : "text-warning"}>
                  {section.completed ? "Fullfort" : "Mangler"}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/company/onboarding">
            <Button>Fortsett registrering</Button>
          </Link>
        </Card>

        <Card className="flex flex-col gap-4">
          <h3 className="text-lg font-bold text-primary">Hva skjer na?</h3>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-ink/80">
            <li>Fullfor alle stegene i registreringen.</li>
            <li>Be OSH-teamet registrere dere pa onsket event.</li>
            <li>Admin setter pakke (Standard/Solv/Gull/Platinum).</li>
            <li>Se leads og ROI i dashboardet.</li>
          </ol>
          <Link href="/company/events">
            <Button variant="secondary">Se eventpameldinger</Button>
          </Link>
        </Card>
      </section>
    </div>
  );
}
