import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { updateConsent } from "@/app/admin/leads/actions";

type PageProps = {
  params: Promise<{ consentId: string }>;
};

export default async function AdminLeadDetailPage({ params }: PageProps) {
  await requireRole("admin");
  const { consentId } = await params;
  const supabase = createAdminSupabaseClient();

  const { data: consent, error } = await supabase
    .from("consents")
    .select("id, consent, consented_at, updated_at, student:students(full_name, email), company:companies(name), event:events(name)")
    .eq("id", consentId)
    .single();

  if (error) throw error;
  const typedConsent = consent as unknown as {
    id: string;
    consent: boolean;
    consented_at: string;
    updated_at: string | null;
    student?: { full_name?: string; email?: string };
    company?: { name?: string };
    event?: { name?: string };
  };

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Lead"
        title={typedConsent.student?.full_name ?? "Student"}
        description="Oppdater samtykke og se detaljer."
        actions={
          <Link className="text-sm font-semibold text-primary/70 hover:text-primary" href="/admin/leads">
            ← Tilbake
          </Link>
        }
      />

      <Card className="flex flex-col gap-3 text-sm text-ink/80">
        <p><span className="font-semibold text-primary">Student:</span> {typedConsent.student?.full_name ?? "—"} ({typedConsent.student?.email ?? "—"})</p>
        <p><span className="font-semibold text-primary">Bedrift:</span> {typedConsent.company?.name ?? "—"}</p>
        <p><span className="font-semibold text-primary">Event:</span> {typedConsent.event?.name ?? "—"}</p>
        <p><span className="font-semibold text-primary">Samtykke gitt:</span> {typedConsent.consent ? "Ja" : "Nei"}</p>
        <p><span className="font-semibold text-primary">Oppdatert:</span> {typedConsent.updated_at ? new Date(typedConsent.updated_at).toLocaleString("nb-NO") : "—"}</p>
      </Card>

      <Card className="flex flex-col gap-4">
        <form action={updateConsent} className="grid gap-3 md:grid-cols-3">
          <input type="hidden" name="consentId" value={typedConsent.id} />
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Samtykke
            <Select name="consent" defaultValue={typedConsent.consent ? "true" : "false"}>
              <option value="true">Gi samtykke</option>
              <option value="false">Fjern samtykke</option>
            </Select>
          </label>
          <Button className="md:self-end" variant="secondary" type="submit">Oppdater</Button>
        </form>
      </Card>
    </div>
  );
}
