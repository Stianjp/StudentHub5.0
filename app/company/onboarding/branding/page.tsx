import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
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

  if (!company) {
    return (
      <Card className="border border-warning/30 bg-warning/10 text-sm text-ink/90">
        Bedriftskontoen din er ikke godkjent ennå. En admin må godkjenne tilgang før du kan fylle inn branding.
      </Card>
    );
  }

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
          <input type="hidden" name="next" value="/company/onboarding/complete" />
          <label className="text-sm font-semibold text-primary">
            Bedriftskultur og DNA
            <p className="mt-1 text-xs font-normal text-ink/70">
              Velg 3–5 stikkord som beskriver "viben" på kontoret (f.eks. Sosialt, Innovativt, Flatt hierarki).
            </p>
            <Input name="brandingValues" defaultValue={company.branding_values.join(", ")} placeholder="Sosialt, Innovativt, Flatt hierarki" />
          </label>
          <label className="text-sm font-semibold text-primary">
            Deres unike løfte – EVP
            <p className="mt-1 text-xs font-normal text-ink/70">
              Maks 150 tegn. Dette er det første studenten ser i match-score forklaringen.
            </p>
            <Textarea
              name="brandingEvp"
              defaultValue={company.branding_evp ?? ""}
              placeholder="Hos oss får du..."
              rows={3}
            />
          </label>
          <label className="text-sm font-semibold text-primary">
            Prosjekter og utfordringer
            <p className="mt-1 text-xs font-normal text-ink/70">
              Beskriv konkrete teknologier eller problemer dere skal løse i 2026. Dette brukes for faglig matching.
            </p>
            <Textarea name="brandingMessage" defaultValue={company.branding_message ?? ""} rows={4} />
          </label>

          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary">Preferanser for matching</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="text-sm font-semibold text-primary">
                Arbeidsstil
                <Select name="workStyle" defaultValue={company.work_style ?? ""}>
                  <option value="">Velg</option>
                  <option value="Fast kontorplass">Fast kontorplass</option>
                  <option value="Hybrid hverdag">Hybrid hverdag</option>
                  <option value="Full fleksibilitet">Full fleksibilitet</option>
                </Select>
              </label>
              <label className="text-sm font-semibold text-primary">
                Sosial profil
                <Select name="socialProfile" defaultValue={company.social_profile ?? ""}>
                  <option value="">Velg</option>
                  <option value="Høy sosial faktor">Høy sosial faktor</option>
                  <option value="Balansert">Balansert</option>
                  <option value="Fokus på faglig ro">Fokus på faglig ro</option>
                </Select>
              </label>
            </div>
          </div>

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
