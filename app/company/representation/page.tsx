import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { RepresentationForm } from "@/components/company/representation-form";
import { requireRole } from "@/lib/auth";
import { getOrCreateCompanyForUser } from "@/lib/company";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { saveCompanyRepresentation } from "@/app/company/actions";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CompanyRepresentationPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const profile = await requireRole("company");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");

  const company = await getOrCreateCompanyForUser(profile.id, user.email);
  const saved = params.saved === "1";
  const statusError = typeof params.error === "string" ? params.error : "";

  if (!company) {
    return (
      <Card className="border border-warning/30 bg-warning/10 text-sm text-ink/90">
        Bedriftskontoen din er ikke godkjent ennå. En admin må godkjenne tilgang før du kan fylle inn representasjonstekst.
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Bedriftsprofil"
        title="Representasjon"
        description="Skriv en kort offentlig presentasjon av bedriften. Maks 250 ord."
        tone="light"
      />

      {saved ? (
        <Card className="border border-success/30 bg-success/10 text-sm font-semibold text-success">
          Representasjonsteksten er lagret.
        </Card>
      ) : null}

      {statusError ? (
        <Card className="border border-error/30 bg-error/10 text-sm font-semibold text-error">
          {decodeURIComponent(statusError)}
        </Card>
      ) : null}

      <Card className="flex flex-col gap-4">
        <RepresentationForm
          action={saveCompanyRepresentation}
          defaultValue={company.representation_text ?? ""}
        />
      </Card>
    </div>
  );
}
