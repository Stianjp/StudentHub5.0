import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { requireRole } from "@/lib/auth";
import { getOrCreateCompanyForUser } from "@/lib/company";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { saveCompanyInfo } from "@/app/company/actions";
import { OnboardingSteps } from "@/components/company/onboarding-steps";

export default async function CompanyOnboardingInfoPage() {
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
        title="Steg 1: Firma-info"
        description="Fortell oss litt om bedriften. Dette hjelper studentene å forstå hvem dere er."
      />

      <OnboardingSteps current="info" />

      <Card className="flex flex-col gap-4">
        <form action={saveCompanyInfo} className="grid gap-4">
          <input type="hidden" name="next" value="/company/onboarding/recruitment" />
          <label className="text-sm font-semibold text-primary">
            Firmanavn
            <Input name="name" defaultValue={company.name} required />
          </label>
          <label className="text-sm font-semibold text-primary">
            Organisasjonsnummer (9 siffer)
            <Input
              name="orgNumber"
              defaultValue={company.org_number ?? ""}
              required
              placeholder="987654321"
              inputMode="numeric"
              pattern="[0-9]{9}"
            />
          </label>
          <label className="text-sm font-semibold text-primary">
            Bransje
            <Input name="industry" defaultValue={company.industry ?? ""} placeholder="F.eks. Teknologi" />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-primary">
              Størrelse
              <Input name="size" defaultValue={company.size ?? ""} placeholder="f.eks. 50-200" />
            </label>
            <label className="text-sm font-semibold text-primary">
              Lokasjon
              <Input name="location" defaultValue={company.location ?? ""} placeholder="Oslo" />
            </label>
          </div>
          <label className="text-sm font-semibold text-primary">
            Nettside
            <Input name="website" defaultValue={company.website ?? ""} placeholder="https://" />
          </label>

          <div className="flex flex-col gap-2 text-sm text-ink/70">
            <p>Tips: Bransje, lokasjon og størrelse brukes til å forbedre matching.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit">Lagre og gå videre</Button>
            <Link className="text-sm font-semibold text-primary/70 hover:text-primary" href="/company/onboarding/recruitment">
              Hopp til steg 2 →
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
