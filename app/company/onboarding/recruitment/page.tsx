import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { requireRole } from "@/lib/auth";
import { getOrCreateCompanyForUser } from "@/lib/company";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { saveCompanyRecruitment } from "@/app/company/actions";
import { OnboardingSteps } from "@/components/company/onboarding-steps";

export default async function CompanyOnboardingRecruitmentPage() {
  const profile = await requireRole("company");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");
  const company = await getOrCreateCompanyForUser(profile.id, user.email);

  if (!company) {
    return (
      <Card className="border border-warning/30 bg-warning/10 text-sm text-ink/90">
        Bedriftskontoen din er ikke godkjent ennå. En admin må godkjenne tilgang før du kan fylle inn rekrutteringsbehov.
      </Card>
    );
  }

  const fieldOptions = [
    "BYGGINGENIØRER",
    "DATAINGENIØR/IT",
    "ELEKTROINGENIØRER",
    "ENERGI & MILJØ INGENIØR",
    "BIOTEKNOLOGI- OG KJEMIINGENIØR",
    "MASKINIGENIØRER",
    "ØKONOMI OG ADMINISTRASJON",
    "LEDELSE",
    "HUMAN RESOURCES",
  ];

  const jobTypeOptions = [
    "Fast jobb",
    "Deltidsjobb",
    "Sommerjobb",
    "Graduate-stilling",
    "Bacheloroppgave",
    "Masteroppgave",
  ];

  const levelOptions = ["Bachelor", "Master"];
  const bachelorYears = [1, 2, 3];
  const masterYears = [1, 2, 3, 4, 5];

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Bedriftsregistrering"
        title="Steg 2: Rekrutteringsbehov"
        description="Kryss av for hvilke studentgrupper og jobbkategorier dere ønsker."
      />

      <OnboardingSteps current="recruitment" />

      <Card className="flex flex-col gap-4">
        <form action={saveCompanyRecruitment} className="grid gap-5">
          <input type="hidden" name="next" value="/company/onboarding/branding" />
          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-primary">
              Vi er interessert i studenter innenfor…
            </legend>
            <div className="grid gap-2 md:grid-cols-2">
              {fieldOptions.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 rounded-xl border border-primary/10 bg-surface px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="recruitmentFields"
                    value={option}
                    defaultChecked={company.recruitment_fields.includes(option)}
                    className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                  />
                  <span className="font-semibold text-primary">{option}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-primary">Ønsket nivå</legend>
            <div className="flex flex-wrap gap-2">
              {levelOptions.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 rounded-full border border-primary/20 bg-surface px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="recruitmentLevels"
                    value={option}
                    defaultChecked={company.recruitment_levels.includes(option)}
                    className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-primary">Årstrinn bachelor</legend>
            <div className="flex flex-wrap gap-2">
              {bachelorYears.map((year) => (
                <label
                  key={`bachelor-${year}`}
                  className="flex items-center gap-2 rounded-full border border-primary/20 bg-surface px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="recruitmentYearsBachelor"
                    value={year}
                    defaultChecked={company.recruitment_years_bachelor.includes(year)}
                    className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                  />
                  {year}. år
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-primary">Årstrinn master</legend>
            <div className="flex flex-wrap gap-2">
              {masterYears.map((year) => (
                <label
                  key={`master-${year}`}
                  className="flex items-center gap-2 rounded-full border border-primary/20 bg-surface px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="recruitmentYearsMaster"
                    value={year}
                    defaultChecked={company.recruitment_years_master.includes(year)}
                    className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                  />
                  {year}. år
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-primary">Jobbtyper dere rekrutterer til</legend>
            <div className="grid gap-2 md:grid-cols-2">
              {jobTypeOptions.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 rounded-xl border border-primary/10 bg-surface px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="recruitmentJobTypes"
                    value={option}
                    defaultChecked={company.recruitment_job_types.includes(option)}
                    className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-primary">
              Andre nøkkelord (valgfritt)
            </legend>
            <label className="text-sm text-ink/70">
              Hvis dere ønsker å legge til egne nøkkelord kan dere gjøre det senere i admin.
            </label>
            <input type="hidden" name="recruitmentRoles" value="" />
            <input type="hidden" name="recruitmentTiming" value="" />
          </fieldset>

          <div className="flex flex-col gap-2 text-sm text-ink/70">
            <p>Tips: Feltene brukes i matching og for å generere en topp-liste i dashboardet.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit">Lagre og gå videre</Button>
            <Link className="text-sm font-semibold text-primary/70 hover:text-primary" href="/company/onboarding/branding">
              Hopp til steg 3 →
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
