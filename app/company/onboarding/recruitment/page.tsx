import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Bedriftsregistrering"
        title="Steg 2: Rekrutteringsbehov"
        description="Hvilke roller og studieretninger er dere ute etter? Komma-separer tags."
      />

      <OnboardingSteps current="recruitment" />

      <Card className="flex flex-col gap-4">
        <form action={saveCompanyRecruitment} className="grid gap-4">
          <label className="text-sm font-semibold text-primary">
            Roller
            <Input name="recruitmentRoles" defaultValue={company.recruitment_roles.join(", ")} placeholder="Frontendutvikler, Analytiker" />
          </label>
          <label className="text-sm font-semibold text-primary">
            Studieretninger / fagfelt
            <Input name="recruitmentFields" defaultValue={company.recruitment_fields.join(", ")} placeholder="Informatikk, Økonomi" />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-primary">
              Nivå
              <Input name="recruitmentLevels" defaultValue={company.recruitment_levels.join(", ")} placeholder="Bachelor, Master" />
            </label>
            <label className="text-sm font-semibold text-primary">
              Jobbtyper
              <Input name="recruitmentJobTypes" defaultValue={company.recruitment_job_types.join(", ")} placeholder="Sommerjobb, Internship" />
            </label>
          </div>
          <label className="text-sm font-semibold text-primary">
            Tidspunkt
            <Input name="recruitmentTiming" defaultValue={company.recruitment_timing.join(", ")} placeholder="Sommer 2026" />
          </label>

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
