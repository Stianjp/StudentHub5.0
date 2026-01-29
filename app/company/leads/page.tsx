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
  const supabase = await createServerSupabaseClient();
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
        title="Leads fra stand og studentportal"
        description="Du ser alle leads. Kontaktinfo vises kun når samtykke er gitt."
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
          <p className="text-sm text-ink/70">Ingen leads enda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-primary/10 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-primary/60">
                  <th className="px-3 py-2">Navn</th>
                  <th className="px-3 py-2">Studie</th>
                  <th className="px-3 py-2">Interesser</th>
                  <th className="px-3 py-2">Kontakt</th>
                  <th className="px-3 py-2">Samtykke</th>
                  <th className="px-3 py-2">Kilde</th>
                  <th className="px-3 py-2">Event</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {leads.map(({ lead, consent, student, event }) => (
                  <tr key={lead.id} className="align-top">
                    <td className="px-3 py-3 font-semibold text-primary">
                      {student?.full_name ?? "Ukjent student"}
                    </td>
                    <td className="px-3 py-3 text-ink/80">
                      {lead.field_of_study ?? student?.study_program ?? "—"}
                      <div className="text-xs text-ink/60">
                        {lead.study_level ?? student?.study_level ?? ""}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-ink/80">
                      {lead.interests?.length ? lead.interests.join(", ") : "—"}
                      <div className="text-xs text-ink/60">{lead.job_types?.join(", ") ?? ""}</div>
                    </td>
                    <td className="px-3 py-3 text-ink/80">
                      {consent?.consent ? (
                        <>
                          <div>{student?.email ?? "—"}</div>
                          <div className="text-xs text-ink/60">{student?.phone ?? ""}</div>
                        </>
                      ) : (
                        <div className="text-xs text-ink/60">Skjult (ingen samtykke)</div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {consent?.consent ? (
                        <Badge variant="success">Samtykke</Badge>
                      ) : (
                        <Badge variant="warning">Ingen</Badge>
                      )}
                      <div className="text-xs text-ink/60">
                        {consent?.updated_at
                          ? new Date(consent.updated_at).toLocaleString("nb-NO")
                          : "—"}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-ink/80">
                      {lead.source === "stand" ? "Stand" : "Studentportal"}
                    </td>
                    <td className="px-3 py-3 text-ink/80">{event?.name ?? "—"}</td>
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
