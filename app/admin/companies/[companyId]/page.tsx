import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { deleteCompanyAction, removeCompanyFromEventAction } from "@/app/admin/actions";
import { requireRole } from "@/lib/auth";
import {
  getCompanyPortalAccessOverview,
  getCompanyWithDetails,
  listCompanyLeads,
  listCompanyRegistrations,
} from "@/lib/admin";

const packageLabel: Record<string, string> = {
  standard: "Standard",
  silver: "Sølv",
  gold: "Gull",
  platinum: "Platinum",
};

type PageProps = {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("nb-NO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminCompanyDetailPage({ params, searchParams }: PageProps) {
  await requireRole("admin");
  const { companyId } = await params;
  const resolvedSearchParams = await searchParams;
  const errorMessage = firstValue(resolvedSearchParams.error);
  const removed = firstValue(resolvedSearchParams.removed) === "1";

  const [company, registrations, leads, portalAccess] = await Promise.all([
    getCompanyWithDetails(companyId),
    listCompanyRegistrations(companyId),
    listCompanyLeads(companyId),
    getCompanyPortalAccessOverview(companyId),
  ]);

  const typedRegistrations = registrations as unknown as Array<{
    id: string;
    event_id: string;
    application_id: string | null;
    application_campaign_id: string | null;
    stand_code: string | null;
    stand_type: string | null;
    package: string;
    event?: { id?: string; name?: string };
  }>;

  const typedLeads = leads as unknown as Array<{
    lead: { id: string; source: string; field_of_study?: string | null; study_level?: string | null };
    consent?: { consent?: boolean; updated_at?: string | null } | null;
    student?: { full_name?: string; study_program?: string; email?: string; phone?: string };
    event?: { name?: string };
  }>;

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Bedrift"
        title={company.name}
        description={company.industry ?? "Bransje ikke satt"}
        actions={
          <Link className="text-sm font-semibold text-primary/70 transition hover:text-primary" href="/admin/companies">
            ← Tilbake
          </Link>
        }
      />

      {errorMessage ? (
        <Card className="border border-error/30 bg-error/10 text-sm text-error">
          {decodeURIComponent(errorMessage)}
        </Card>
      ) : null}
      {removed ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">
          Bedriften er fjernet fra arrangementet, og eventuell reservert stand er frigjort.
        </Card>
      ) : null}

      <Card className="grid gap-3 text-sm text-ink/80 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Firmainfo</p>
          <p className="text-base font-semibold text-primary">{company.name}</p>
          <p>Org.nr: {company.org_number ?? "—"}</p>
          <p>Lokasjon: {company.location ?? "—"}</p>
          <p>Størrelse: {company.size ?? "—"}</p>
          <p>Nettside: {company.website ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Rekruttering</p>
          <p>Roller: {company.recruitment_roles.join(", ") || "—"}</p>
          <p>Studieretninger: {company.recruitment_fields.join(", ") || "—"}</p>
          <p>Nivå: {company.recruitment_levels.join(", ") || "—"}</p>
          <p>Jobbtyper: {company.recruitment_job_types.join(", ") || "—"}</p>
        </div>
        <div className="md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Branding</p>
          <p>Verdier: {company.branding_values.join(", ") || "—"}</p>
          <p>EVP: {company.branding_evp ?? "—"}</p>
          <p>Budskap: {company.branding_message ?? "—"}</p>
        </div>
      </Card>

      <Card className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-primary">Portaltilganger</h3>
          <p className="text-sm text-ink/70">
            Her ser du hvilke e-postadresser som har tilgang til bedriftsportalen, hva som venter på godkjenning og invite-historikken fra registrering.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-bold text-primary">Aktive brukere</h4>
              <Badge variant="success">{portalAccess.activeUsers.length}</Badge>
            </div>
            {portalAccess.activeUsers.length === 0 ? (
              <p className="text-sm text-ink/70">Ingen godkjente portalbrukere ennå.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {portalAccess.activeUsers.map((user) => (
                  <li key={user.id} className="rounded-xl border border-primary/10 bg-white px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-primary">{user.fullName ?? user.email ?? "Bruker"}</p>
                        <p className="text-sm text-ink/80">{user.email ?? "Fant ikke e-post"}</p>
                      </div>
                      <Badge variant="success">Godkjent</Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-ink/60">
                      <p>Rolle: {user.role || "member"}</p>
                      <p>Godkjent: {formatDateTime(user.approved_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-bold text-primary">Venter på godkjenning</h4>
              <Badge variant="warning">{portalAccess.pendingRequests.length}</Badge>
            </div>
            {portalAccess.pendingRequests.length === 0 ? (
              <p className="text-sm text-ink/70">Ingen ventende tilgangsforespørsler.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {portalAccess.pendingRequests.map((request) => (
                  <li key={request.id} className="rounded-xl border border-primary/10 bg-white px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-primary">{request.fullName ?? request.email}</p>
                        <p className="text-sm text-ink/80">{request.email}</p>
                      </div>
                      <Badge variant="warning">Venter</Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-ink/60">
                      <p>Domene: {request.domain || "—"}</p>
                      <p>Registrert: {formatDateTime(request.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-bold text-primary">Invite-historikk</h4>
              <Badge variant="info">{portalAccess.portalInvites.length}</Badge>
            </div>
            {portalAccess.portalInvites.length === 0 ? (
              <p className="text-sm text-ink/70">Ingen portalinvitasjoner funnet for denne bedriften.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {portalAccess.portalInvites.map((invite) => (
                  <li key={invite.id} className="rounded-xl border border-primary/10 bg-white px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-primary">{invite.fullName ?? invite.email}</p>
                        <p className="text-sm text-ink/80">{invite.email}</p>
                      </div>
                      <Badge
                        variant={
                          invite.status === "accepted"
                            ? "success"
                            : invite.status === "revoked"
                              ? "warning"
                              : "info"
                        }
                      >
                        {invite.status === "accepted"
                          ? "Aktiv"
                          : invite.status === "revoked"
                            ? "Trukket tilbake"
                            : invite.status === "pending"
                              ? "Venter"
                              : "Invitert"}
                      </Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-ink/60">
                      <p>Invitert: {formatDateTime(invite.invited_at ?? invite.created_at)}</p>
                      <p>Akseptert: {formatDateTime(invite.accepted_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="text-xs text-ink/60">
          Trenger du å godkjenne en ny bruker? Gå til{" "}
          <Link className="font-semibold text-primary hover:text-primary/80" href="/admin/companies/register#tilgangsforesporsler">
            Tilgangsforespørsler
          </Link>
          .
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Event-deltakelser</h3>
        {registrations.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen registreringer enda.</p>
        ) : (
          <ul className="grid gap-2 text-sm text-ink/80">
            {typedRegistrations.map((reg) => (
              <li key={reg.id} className="rounded-xl bg-primary/5 px-3 py-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-primary">{reg.event?.name ?? "Event"}</p>
                    <p className="text-xs text-ink/70">Standnivå fra pakke: {reg.stand_type ?? "—"}</p>
                    <p className="text-xs text-ink/70">Standkode: {reg.stand_code ?? "—"}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <Badge variant={reg.package === "platinum" ? "success" : "default"}>
                      {packageLabel[reg.package] ?? reg.package}
                    </Badge>
                    {reg.application_id && reg.application_campaign_id ? (
                      <Link
                        className="button-link text-xs"
                        href={`/admin/events/${reg.event_id}/registration/${reg.application_campaign_id}/applications/${reg.application_id}`}
                      >
                        Oppdater standplass
                      </Link>
                    ) : null}
                    <form action={removeCompanyFromEventAction}>
                      <input type="hidden" name="registrationId" value={reg.id} />
                      <input type="hidden" name="returnTo" value={`/admin/companies/${companyId}`} />
                      <Button type="submit" variant="danger" className="min-h-9 px-4 py-2 text-xs">
                        Fjern fra event
                      </Button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Leads</h3>
        {leads.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen leads enda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-primary/10 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-primary/60">
                  <th className="px-3 py-2">Navn</th>
                  <th className="px-3 py-2">Studie</th>
                  <th className="px-3 py-2">Kontakt</th>
                  <th className="px-3 py-2">Event</th>
                  <th className="px-3 py-2">Samtykke</th>
                  <th className="px-3 py-2">Kilde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {typedLeads.map((lead) => (
                  <tr key={lead.lead.id} className="align-top">
                    <td className="px-3 py-3 font-semibold text-primary">
                      {lead.student?.full_name ?? "Ukjent"}
                    </td>
                    <td className="px-3 py-3 text-ink/80">
                      {lead.lead.field_of_study ?? lead.student?.study_program ?? "—"}
                      <div className="text-xs text-ink/60">
                        {lead.lead.study_level ?? ""}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-ink/80">
                      {lead.consent?.consent ? (
                        <>
                          <div>{lead.student?.email ?? "—"}</div>
                          <div className="text-xs text-ink/60">{lead.student?.phone ?? ""}</div>
                        </>
                      ) : (
                        <div className="text-xs text-ink/60">Skjult (ingen samtykke)</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-ink/80">{lead.event?.name ?? "—"}</td>
                    <td className="px-3 py-3">
                      {lead.consent?.consent ? (
                        <Badge variant="success">Samtykke</Badge>
                      ) : (
                        <Badge variant="warning">Ingen</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3 text-ink/80">
                      {lead.lead.source === "stand" ? "Stand" : "Studentportal"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-4 border border-error/20 bg-error/5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-error/70">Faresone</p>
          <h3 className="text-lg font-bold text-error">Slett bedrift</h3>
          <p className="mt-2 text-sm text-ink/80">
            Dette sletter bedriften permanent. Relaterte rader som peker til bedriften blir slettet eller satt til tom verdi av databasen.
          </p>
          <p className="mt-1 text-sm text-ink/80">
            For å bekrefte, skriv inn <span className="font-semibold text-error">{company.name}</span>.
          </p>
        </div>

        <form action={deleteCompanyAction} className="flex flex-col gap-3 md:max-w-xl">
          <input type="hidden" name="companyId" value={company.id} />
          <label className="text-sm font-semibold text-error">
            Bekreft bedriftsnavn
            <Input
              name="confirmationName"
              placeholder={company.name}
              className="border-error/30 bg-white"
            />
          </label>
          <div>
            <Button type="submit" variant="danger">
              Slett bedrift permanent
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
