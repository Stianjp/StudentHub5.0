import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { requireRole } from "@/lib/auth";
import { getOrCreateCompanyForUser } from "@/lib/company";
import { getCompanyOnboardingStatus } from "@/lib/company-onboarding";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { OnboardingSteps } from "@/components/company/onboarding-steps";

export default async function CompanyOnboardingCompletePage() {
  const profile = await requireRole("company");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");
  const company = await getOrCreateCompanyForUser(profile.id, user.email);
  const status = getCompanyOnboardingStatus(company);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Bedriftsregistrering"
        title="Oppsummering"
        description="Du er nesten klar! Her er status og neste steg."
      />

      <OnboardingSteps current="complete" />

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-primary">Fullføringsgrad</p>
          <div className="h-3 w-full rounded-full bg-primary/10">
            <div
              className="h-3 rounded-full bg-secondary"
              style={{ width: `${status.progress}%` }}
            />
          </div>
          <p className="text-xs text-ink/70">{status.completedCount} av {status.total} steg fullført.</p>
        </div>
        <ul className="grid gap-2 text-sm text-ink/80">
          {status.sections.map((section) => (
            <li key={section.key} className="flex items-center justify-between rounded-xl bg-primary/5 px-3 py-2">
              <span className="font-semibold text-primary">{section.label}</span>
              <span className={section.completed ? "text-success" : "text-warning"}>
                {section.completed ? "Fullført" : "Mangler"}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/company">
            <Button>Gå til bedriftsdashboard</Button>
          </Link>
          <Link className="text-sm font-semibold text-primary/70 hover:text-primary" href="/company/events">
            Se eventpåmeldinger →
          </Link>
        </div>
      </Card>
    </div>
  );
}
