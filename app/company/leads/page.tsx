import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { requireRole } from "@/lib/auth";
import {
  getCompanyLeads,
  getCompanyRegistrations,
  getOrCreateCompanyForUser,
  hasLeadDetailsAccessForRegistration,
} from "@/lib/company";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

function sourceLabel(source: string) {
  if (source === "stand") return "Stand";
  if (source === "ticket") return "Påmelding";
  return "Studentportal";
}

export default async function CompanyLeadsPage() {
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
        Bedriftskontoen din er ikke godkjent ennå. En admin må godkjenne tilgang før du kan se leads.
      </Card>
    );
  }

  const [leads, registrations] = await Promise.all([
    getCompanyLeads(companyId),
    getCompanyRegistrations(companyId),
  ]);

  const leadAccessByEvent = new Map(
    registrations.map((registration) => [
      registration.event_id,
      hasLeadDetailsAccessForRegistration(registration),
    ]),
  );
  const hasAnyDetailedLeadAccess = Array.from(leadAccessByEvent.values()).some(Boolean);

  const grouped = leads.reduce<Record<string, typeof leads>>((acc, row) => {
    const key = row.event?.id ?? "no-event";
    acc[key] = acc[key] ?? [];
    acc[key].push(row);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Leads"
        title="Leads fra stand og studentportal"
        description={
          hasAnyDetailedLeadAccess
            ? "Full lead-visning på events med Gull/Platinum eller ekstra Leads-tilgang. Andre events vises anonymisert."
            : "Standard/Sølv: Du ser antall leads og anonymisert innsikt (studie, år og interesser)."
        }
        actions={
          hasAnyDetailedLeadAccess ? (
            <Link
              className={cn(
                "inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-surface transition hover:bg-primary/90",
              )}
              href="/api/company/leads/export"
            >
              Eksporter CSV
            </Link>
          ) : undefined
        }
      />

      {!hasAnyDetailedLeadAccess ? (
        <Card className="border border-warning/30 bg-warning/10 text-sm text-ink/90">
          Denne pakken gir ikke tilgang til navn eller kontaktinfo. Oppgrader til Gull/Platinum, eller aktiver ekstra tilgang i Bedriftspakker.
        </Card>
      ) : null}

      {leads.length === 0 ? (
        <Card className="flex flex-col gap-4">
          <p className="text-sm text-ink/70">Ingen leads enda.</p>
        </Card>
      ) : (
        Object.entries(grouped).map(([eventId, rows]) => {
          const eventName = rows[0]?.event?.name ?? "Uten event";
          const hasDetailedLeadAccessForGroup =
            eventId === "no-event"
              ? hasAnyDetailedLeadAccess
              : (leadAccessByEvent.get(eventId) ?? false);
          return (
            <Card key={eventId} className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-primary">{eventName}</p>
                  <p className="text-xs text-ink/60">{rows.length} leads</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-primary/10 text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-primary/60">
                      <th className="px-3 py-2">{hasDetailedLeadAccessForGroup ? "Navn" : "Lead"}</th>
                      <th className="px-3 py-2">Studie</th>
                      <th className="px-3 py-2">År</th>
                      <th className="px-3 py-2">Interesser</th>
                      <th className="px-3 py-2">Kontakt</th>
                      <th className="px-3 py-2">Samtykke</th>
                      <th className="px-3 py-2">Kilde</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/5">
                    {rows.map(({ lead, consent, student }, index) => {
                      const level = lead.study_level ?? student?.study_level ?? "";
                      const year = lead.study_year;
                      const yearLabel = year ? `${year}. år` : "";
                      const studyYearText = year ? `${yearLabel} ${level ? level.toLowerCase() : ""}`.trim() : "";

                      return (
                        <tr key={lead.id} className="align-top">
                          <td className="px-3 py-3 font-semibold text-primary">
                            {hasDetailedLeadAccessForGroup ? (
                              <Link className="hover:text-secondary" href={`/company/leads/${lead.id}`}>
                                {student?.full_name ?? "Ukjent student"}
                              </Link>
                            ) : (
                              `Lead ${index + 1}`
                            )}
                          </td>
                          <td className="px-3 py-3 text-ink/80">
                            {lead.field_of_study ?? student?.study_program ?? "-"}
                            <div className="text-xs text-ink/60">{lead.study_level ?? student?.study_level ?? ""}</div>
                          </td>
                          <td className="px-3 py-3 text-ink/80">{studyYearText || "-"}</td>
                          <td className="px-3 py-3 text-ink/80">
                            {lead.interests?.length ? lead.interests.join(", ") : "-"}
                            <div className="text-xs text-ink/60">{lead.job_types?.join(", ") ?? ""}</div>
                          </td>
                          <td className="px-3 py-3 text-ink/80">
                            {hasDetailedLeadAccessForGroup ? (
                              consent?.consent ? (
                                <>
                                  <div>{student?.email ?? "-"}</div>
                                  <div className="text-xs text-ink/60">{student?.phone ?? ""}</div>
                                </>
                              ) : (
                                <div className="text-xs text-ink/60">Skjult (ingen samtykke)</div>
                              )
                            ) : (
                              <div className="text-xs text-ink/60">Skjult i denne pakken</div>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {consent?.consent ? (
                              <Badge variant="success">Samtykke</Badge>
                            ) : (
                              <Badge variant="warning">Ingen</Badge>
                            )}
                            <div className="text-xs text-ink/60">
                              {consent?.updated_at ? new Date(consent.updated_at).toLocaleString("nb-NO") : "-"}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-ink/80">{sourceLabel(lead.source)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
