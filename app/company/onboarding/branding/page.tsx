import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Textarea } from "@/components/ui/textarea";
import { requireRole } from "@/lib/auth";
import { getOrCreateCompanyForUser } from "@/lib/company";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { saveCompanyBranding } from "@/app/company/actions";
import { OnboardingSteps } from "@/components/company/onboarding-steps";

export default async function CompanyOnboardingBrandingPage() {
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
        title="Steg 3: Employer branding"
        description="Del verdier, EVP og budskap som skal vises til studentene."
      />

      <OnboardingSteps current="branding" />

      <Card className="flex flex-col gap-4">
        <form action={saveCompanyBranding} className="grid gap-4">
          <label className="text-sm font-semibold text-primary">
            Verdier (tags)
            <Input name="brandingValues" defaultValue={company.branding_values.join(", ")} placeholder="Læring, Autonomi" />
          </label>
          <label className="text-sm font-semibold text-primary">
            EVP (kort tekst)
            <Textarea name="brandingEvp" defaultValue={company.branding_evp ?? ""} rows={3} />
          </label>
          <label className="text-sm font-semibold text-primary">
            Hva vil dere kommunisere?
            <Textarea name="brandingMessage" defaultValue={company.branding_message ?? ""} rows={4} />
          </label>

          <div className="flex flex-col gap-2 text-sm text-ink/70">
            <p>Tips: Dette brukes på event-sidene og i match-score forklaringer.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit">Lagre og fullfør</Button>
            <Link className="text-sm font-semibold text-primary/70 hover:text-primary" href="/company/onboarding/complete">
              Gå til oppsummering →
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
