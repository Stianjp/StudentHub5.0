import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { getOrCreateCompanyForUser } from "@/lib/company";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type LeadPageProps = {
  params: Promise<{ leadId: string }>;
};

export default async function CompanyLeadPage({ params }: LeadPageProps) {
  const { leadId } = await params;
  const profile = await requireRole("company");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");

  const company = await getOrCreateCompanyForUser(profile.id, user.email);
  const companyId = company?.id;
  if (!company || !companyId) {
    return (
      <Card className="border border-warning/30 bg-warning/10 text-sm text-ink/90">
        Bedriftskontoen din er ikke godkjent ennå. En admin må godkjenne tilgang før du kan se lead-detaljer.
      </Card>
    );
  }

  const admin = createAdminSupabaseClient();
  const { data: leadRow, error: leadError } = await admin
    .from("leads")
    .select("*, student:students(*), event:events(id, name)")
    .eq("id", leadId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (leadError) throw leadError;
  if (!leadRow) {
    return (
      <Card className="text-sm text-ink/80">
        Lead ikke funnet.
      </Card>
    );
  }

  const { data: consent } = await admin
    .from("consents")
    .select("*")
    .eq("company_id", companyId)
    .eq("student_id", leadRow.student_id)
    .maybeSingle();

  const student = leadRow.student;
  const level = leadRow.study_level ?? student?.study_level ?? "";
  const year = leadRow.study_year ? `${leadRow.study_year}. år` : "";

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Lead"
        title={student?.full_name ?? "Ukjent student"}
        description={leadRow.event?.name ? `Event: ${leadRow.event.name}` : "Uten event"}
        actions={
          <Link
            className="text-sm font-semibold text-primary/70 hover:text-primary"
            href="/company/leads"
          >
            Tilbake til leads
          </Link>
        }
      />

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {consent?.consent ? <Badge variant="success">Samtykke</Badge> : <Badge variant="warning">Ingen samtykke</Badge>}
          {leadRow.source ? <Badge variant="default">{leadRow.source === "stand" ? "Stand" : "Studentportal"}</Badge> : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2 text-sm text-ink/80">
          <div>
            <p className="font-semibold text-primary">Studieretning</p>
            <p>{leadRow.field_of_study ?? student?.study_program ?? "—"}</p>
          </div>
          <div>
            <p className="font-semibold text-primary">Nivå / år</p>
            <p>{[year, level].filter(Boolean).join(" ") || "—"}</p>
          </div>
          <div>
            <p className="font-semibold text-primary">Interesser</p>
            <p>{leadRow.interests?.length ? leadRow.interests.join(", ") : "—"}</p>
          </div>
          <div>
            <p className="font-semibold text-primary">Jobbønsker</p>
            <p>{leadRow.job_types?.length ? leadRow.job_types.join(", ") : "—"}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 text-sm text-ink/80">
          <div>
            <p className="font-semibold text-primary">Kontaktinfo</p>
            {consent?.consent ? (
              <>
                <p>{student?.email ?? "—"}</p>
                <p className="text-xs text-ink/60">{student?.phone ?? ""}</p>
              </>
            ) : (
              <p className="text-xs text-ink/60">Skjult (ingen samtykke)</p>
            )}
          </div>
          <div>
            <p className="font-semibold text-primary">Om studenten</p>
            <p>{student?.about ?? "Ingen tekst lagt inn."}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
