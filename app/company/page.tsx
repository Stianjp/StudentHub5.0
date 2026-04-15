import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Stat } from "@/components/ui/stat";
import { requireRole } from "@/lib/auth";
import { getCompanyLeads, getCompanyRegistrations, getLatestCompanyRegistrationLogo, getOrCreateCompanyForUser } from "@/lib/company";
import { getCompanyOnboardingStatus } from "@/lib/company-onboarding";
import { listActiveEvents } from "@/lib/events";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { uploadCompanyLogoForCompanyAction } from "@/app/company/actions";
import { LogoPreview } from "@/app/company/logo-preview";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CompanyDashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
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
        Bedriftskontoen din er ikke godkjent ennå. En admin må godkjenne tilgang før du kan se dashboardet.
      </Card>
    );
  }

  const [registrations, leads, events, registrationLogo] = await Promise.all([
    getCompanyRegistrations(companyId),
    getCompanyLeads(companyId),
    listActiveEvents(),
    getLatestCompanyRegistrationLogo(companyId),
  ]);
  const typedLeads = leads as Array<{ consent: { consent: boolean } | null }>;
  const consentedLeads = typedLeads.filter((lead) => lead.consent?.consent).length;

  const onboarding = getCompanyOnboardingStatus(company);
  const statusError = typeof params.error === "string" ? params.error : "";
  const saved = params.saved === "1";

  return (
    <div className="flex flex-col gap-10">
      <SectionHeader
        eyebrow="Bedriftsdashboard"
        title={`Hei ${company.name}`}
        description="Her får du oversikt og neste steg. Registreringen er delt opp for å gjøre det enklere."
        actions={
          <Link href="/company/onboarding">
            <Button variant="secondary">Gå til registrering</Button>
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Stat label="Event-deltakelser" value={registrations.length} hint="Registrerte events" href="/company/events" />
        <Stat label="Leads med samtykke" value={consentedLeads} hint="Kun consent=true" href="/company/leads" />
        <Stat label="Aktive events" value={events.length} hint="Tilgjengelige nå" />
      </section>

      {saved ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">
          Logo oppdatert.
        </Card>
      ) : null}
      {statusError ? (
        <Card className="border border-error/30 bg-error/10 text-sm text-error">
          {decodeURIComponent(statusError)}
        </Card>
      ) : null}

      {registrationLogo?.logoUrl ? (
        <Card className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-primary/10 bg-white p-3">
                <Image
                  src={registrationLogo.logoUrl}
                  alt={`Logo for ${company.name}`}
                  width={96}
                  height={96}
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Bedriftslogo</p>
                <p className="text-lg font-bold text-primary">{company.name}</p>
                <p className="text-sm text-ink/75">
                  Denne logoen brukes på student-, event-, jobb- og thesis-sider som henter firmalogo sentralt.
                </p>
              </div>
            </div>
            <Link href="/company/events">
              <Button variant="secondary">Se eventpåmeldinger</Button>
            </Link>
          </div>

          <LogoPreview logoUrl={registrationLogo.logoUrl} companyName={company.name} />

          <form action={uploadCompanyLogoForCompanyAction} className="flex flex-col gap-3 rounded-2xl border border-primary/10 bg-primary/5 p-4 md:flex-row md:items-end">
            <label className="flex-1 text-sm font-semibold text-primary">
              Last opp ny logo
              <Input name="logo" type="file" accept="image/*" required className="mt-2 rounded-2xl" />
            </label>
            <Button type="submit" variant="secondary">Oppdater logo</Button>
          </form>
        </Card>
      ) : (
        <Card className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Bedriftslogo</p>
            <p className="text-lg font-bold text-primary">{company.name}</p>
            <p className="text-sm text-ink/75">
              Ingen logo er lastet opp ennå. Last opp en logo her, så brukes den på alle sider som viser bedriften.
            </p>
          </div>
          <form action={uploadCompanyLogoForCompanyAction} className="flex flex-col gap-3 rounded-2xl border border-primary/10 bg-primary/5 p-4 md:flex-row md:items-end">
            <label className="flex-1 text-sm font-semibold text-primary">
              Last opp logo
              <Input name="logo" type="file" accept="image/*" required className="mt-2 rounded-2xl" />
            </label>
            <Button type="submit" variant="secondary">Lagre logo</Button>
          </form>
        </Card>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="relative overflow-hidden">
          <Image
            src="/images/event_giving_a_sheet.jpg"
            alt="Registrering og oppfølging på event"
            fill
            className="scale-105 object-cover blur-[4px]"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/90 to-primary/84" />
          <div className="relative z-10 flex flex-col gap-4 rounded-2xl border border-surface/25 bg-primary/55 p-4 text-surface shadow-soft backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-surface drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">Registreringsstatus</h3>
              <span className="rounded-full bg-secondary px-3 py-1 text-sm font-bold text-primary">{onboarding.progress}% fullført</span>
            </div>
            <div className="h-3 w-full rounded-full bg-surface/25">
              <div className="h-3 rounded-full bg-secondary" style={{ width: `${onboarding.progress}%` }} />
            </div>
            <ul className="grid gap-2 text-sm text-surface/95">
              {onboarding.sections.map((section) => (
                <li
                  key={section.key}
                  className="flex items-center justify-between rounded-xl border border-surface/20 bg-primary/78 px-3 py-2 shadow-sm backdrop-blur-sm"
                >
                  <span className="font-semibold text-surface">{section.label}</span>
                  <span className={section.completed ? "font-semibold text-success" : "font-semibold text-secondary"}>
                    {section.completed ? "Fullført" : "Mangler"}
                  </span>
                </li>
              ))}
            </ul>
            <Link className="inline-flex" href="/company/onboarding">
              <Button variant="secondary" className="w-full border border-secondary/60">
                Fortsett registrering
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <h3 className="text-lg font-bold text-surface">Hva skjer nå?</h3>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-surface/88">
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

      <section className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <Card className="relative overflow-hidden p-0 lg:col-span-2 lg:self-start">
          <div className="relative aspect-[16/8] w-full">
            <Image
              src="/images/Event_People_talking.jpg"
              alt="Studenter og bedrifter i samtale på event"
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/45 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-surface">
              <h3 className="text-xl font-bold">Bygg relasjoner med riktige kandidater</h3>
              <p className="mt-1 text-sm text-surface/80">
                Bruk dashboardet til å følge opp påmeldinger, leads og neste aktiviteter.
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
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent" />
            </div>
          </Card>
          <Card className="relative overflow-hidden p-0">
            <div className="relative aspect-[4/3] w-full">
              <Image
                src="/images/BigStand.jpg"
                alt="Stand-område under arrangement"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent" />
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
