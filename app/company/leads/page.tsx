import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { requireRole } from "@/lib/auth";
import { getCompanyLeads, getOrCreateCompanyForUser } from "@/lib/company";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function CompanyLeadsPage() {
  const profile = await requireRole("company");
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");

  const company = await getOrCreateCompanyForUser(profile.id, user.email);
  const leads = await getCompanyLeads(company.id);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Leads"
        title="Samtykkede studenter"
        description="Kontaktinfo vises kun når consent=true."
        actions={
          <Link
            className={cn(
              "inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-surface transition hover:bg-primary/90",
            )}
            href="/api/company/leads/export"
          >
            Eksporter CSV
          </Link>
        }
      />

      <Card className="flex flex-col gap-4">
        {leads.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen leads med samtykke enda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-primary/10 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-primary/60">
                  <th className="px-3 py-2">Navn</th>
                  <th className="px-3 py-2">Studie</th>
                  <th className="px-3 py-2">Jobbtype</th>
                  <th className="px-3 py-2">Kontakt</th>
                  <th className="px-3 py-2">Samtykke</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {leads.map(({ consent, student }) => (
                  <tr key={consent.id} className="align-top">
                    <td className="px-3 py-3 font-semibold text-primary">
                      {student?.full_name ?? "Ukjent student"}
                    </td>
                    <td className="px-3 py-3 text-ink/80">
                      {student?.study_program ?? "—"}
                      <div className="text-xs text-ink/60">{student?.study_level ?? ""}</div>
                    </td>
                    <td className="px-3 py-3 text-ink/80">{student?.job_types.join(", ") ?? "—"}</td>
                    <td className="px-3 py-3 text-ink/80">
                      <div>{student?.email ?? "—"}</div>
                      <div className="text-xs text-ink/60">{student?.phone ?? ""}</div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="success">{new Date(consent.consented_at).toLocaleString("nb-NO")}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
