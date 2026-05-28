import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CompanyProfileEditor } from "@/components/admin/company-profile-editor";
import { deleteCompanyAction, removeCompanyFromEventAction, uploadCompanyLogoAction } from "@/app/admin/actions";
import { requireRole } from "@/lib/auth";
import {
  getCompanyPortalAccessOverview,
  getCompanyWithDetails,
  listCompanyLeads,
  listCompanyRegistrationApplications,
  listCompanyRegistrations,
} from "@/lib/admin";
import { getLatestCompanyRegistrationLogo } from "@/lib/company";

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

function joinValues(values: string[] | null | undefined) {
  const filtered = (values ?? []).map((value) => value.trim()).filter(Boolean);
  return filtered.length > 0 ? filtered.join(", ") : "—";
}

function candidateLevelLabel(value: "bachelor" | "master" | "both" | null | undefined) {
  if (value === "bachelor") return "Bachelor";
  if (value === "master") return "Master";
  if (value === "both") return "Bachelor og master";
  return "—";
}

function candidateLevelValues(value: "bachelor" | "master" | "both" | null | undefined) {
  if (value === "bachelor") return ["Bachelor"];
  if (value === "master") return ["Master"];
  if (value === "both") return ["Bachelor", "Master"];
  return [];
}

function invoiceDeliveryLabel(value: "ehf" | "email" | null | undefined) {
  if (value === "ehf") return "EHF";
  if (value === "email") return "E-post";
  return "—";
}

function applicationStatusMeta(status: "pending" | "approved" | "rejected") {
  if (status === "approved") return { label: "Godkjent", variant: "success" as const };
  if (status === "rejected") return { label: "Avslått", variant: "warning" as const };
  return { label: "Til behandling", variant: "info" as const };
}

export default async function AdminCompanyDetailPage({ params, searchParams }: PageProps) {
  await requireRole("admin");
  const { companyId } = await params;
  const resolvedSearchParams = await searchParams;
  const errorMessage = firstValue(resolvedSearchParams.error);
  const removed = firstValue(resolvedSearchParams.removed) === "1";

  const [company, registrations, leads, portalAccess, registrationApplications] = await Promise.all([
    getCompanyWithDetails(companyId),
    listCompanyRegistrations(companyId),
    listCompanyLeads(companyId),
    getCompanyPortalAccessOverview(companyId),
    listCompanyRegistrationApplications(companyId),
  ]);
  const companyLogo = await getLatestCompanyRegistrationLogo(companyId);

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

  const typedRegistrationApplications = registrationApplications as Awaited<
    ReturnType<typeof listCompanyRegistrationApplications>
  >;
  const recruitmentLevels =
    company.recruitment_levels.length > 0
      ? company.recruitment_levels
      : candidateLevelValues(typedRegistrationApplications[0]?.application.candidate_level);

  return (
    <div className="flex flex-col gap-8">
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
      {firstValue(resolvedSearchParams.saved) === "1" ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">
          Endring lagret.
        </Card>
      ) : null}

      <div className="flex justify-end">
        <Link className="text-sm font-semibold text-primary/70 transition hover:text-primary" href="/admin/companies">
          ← Tilbake
        </Link>
      </div>

      <CompanyProfileEditor
        company={{
          id: company.id,
          name: company.name,
          org_number: company.org_number,
          industry: company.industry,
          size: company.size,
          location: company.location,
          address: company.address,
          postal_code: company.postal_code,
          city: company.city,
          country: company.country,
          website: company.website,
        }}
      />

      <Card className="grid gap-3 text-sm text-ink/80 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Rekruttering</p>
          <p>Roller: {company.recruitment_roles.join(", ") || "—"}</p>
          <p>Studieretninger: {company.recruitment_fields.join(", ") || "—"}</p>
          <p>Nivå: {joinValues(recruitmentLevels)}</p>
          <p>Jobbtyper: {company.recruitment_job_types.join(", ") || "—"}</p>
        </div>
        <div className="md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Firmalogo</p>
          <div className="mt-3 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="flex min-h-[140px] items-center justify-center overflow-hidden rounded-2xl border border-primary/10 bg-white p-4">
              {companyLogo?.logoUrl ? (
                <Image
                  src={companyLogo.logoUrl}
                  alt={`Logo for ${company.name}`}
                  width={180}
                  height={120}
                  className="h-auto max-h-[110px] w-auto max-w-full object-contain"
                />
              ) : (
                <p className="text-center text-sm text-ink/60">Ingen logo lastet opp</p>
              )}
            </div>
            <div className="grid gap-3">
              <p className="text-sm text-ink/70">
                Last opp eller erstatt bedriftslogoen her. Denne brukes på studentsidene der bedriften vises.
              </p>
              <form action={uploadCompanyLogoAction} className="flex flex-col gap-3 md:max-w-md">
                <input type="hidden" name="companyId" value={companyId} />
                <label className="text-sm font-semibold text-primary">
                  Ny logo
                  <Input name="logo" type="file" accept="image/*" required />
                </label>
                <div className="flex flex-wrap gap-3">
                  <Button type="submit">Last opp logo</Button>
                  {companyLogo?.logoUrl ? (
                    <a
                      className="button-link text-xs"
                      href={companyLogo.logoUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Åpne nåværende logo
                    </a>
                  ) : null}
                </div>
              </form>
            </div>
          </div>
        </div>
      </Card>

      <Card className="grid gap-3 text-sm text-ink/80 md:grid-cols-2">
        <div className="md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Branding</p>
          <p>Verdier: {company.branding_values.join(", ") || "—"}</p>
          <p>EVP: {company.branding_evp ?? "—"}</p>
          <p>Budskap: {company.branding_message ?? "—"}</p>
        </div>
      </Card>

      <Card className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-primary">Påmeldingsgrunnlag</h3>
          <p className="text-sm text-ink/70">
            Her ligger all informasjon som er sendt inn i påmeldingen, slik at du kan lage kontrakt, faktura og intern oppfølging direkte fra bedriftsoversikten.
          </p>
        </div>

        {typedRegistrationApplications.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen eventpåmeldinger funnet for denne bedriften ennå.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {typedRegistrationApplications.map((entry) => {
              const statusMeta = applicationStatusMeta(entry.application.status);
              const applicationLink =
                entry.campaign?.id && entry.event?.id
                  ? `/admin/events/${entry.event.id}/registration/${entry.campaign.id}/applications/${entry.application.id}`
                  : null;

              return (
                <div key={entry.application.id} className="rounded-2xl border border-[#D8CCE8] bg-[#F7F3FF] p-5 text-[#1A1626]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#4F4568]">Påmelding</p>
                      <h4 className="text-base font-bold text-[#140249]">
                        {entry.event?.name ?? entry.campaign?.public_title ?? entry.application.company_name}
                      </h4>
                      <p className="text-sm text-[#443465]">
                        Sendt inn {formatDateTime(entry.application.created_at)}
                        {entry.application.approved_at ? ` · godkjent ${formatDateTime(entry.application.approved_at)}` : ""}
                        {entry.application.rejected_at ? ` · avslått ${formatDateTime(entry.application.rejected_at)}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                      {applicationLink ? (
                        <Link className="button-link text-xs" href={applicationLink}>
                          Åpne søknad
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    <div className="rounded-2xl border border-[#D8CCE8] bg-white p-4 text-sm text-[#1A1626] shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#4F4568]">Kontakt og firma</p>
                      <div className="mt-3 grid gap-1.5 text-[#1A1626]">
                        <p><span className="font-semibold text-[#140249]">Kontaktperson:</span> {entry.application.contact_first_name} {entry.application.contact_last_name}</p>
                        <p><span className="font-semibold text-[#140249]">Stilling:</span> {entry.application.contact_job_title ?? "—"}</p>
                        <p><span className="font-semibold text-[#140249]">Kontakt e-post:</span> {entry.application.contact_email}</p>
                        <p><span className="font-semibold text-[#140249]">Telefon:</span> {entry.application.contact_phone}</p>
                        <p><span className="font-semibold text-[#140249]">Org.nr:</span> {entry.application.org_number}</p>
                        <p><span className="font-semibold text-[#140249]">Adresse:</span> {entry.application.address}, {entry.application.postal_code} {entry.application.city}, {entry.application.country}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#D8CCE8] bg-white p-4 text-sm text-[#1A1626] shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#4F4568]">Fakturagrunnlag</p>
                      <div className="mt-3 grid gap-1.5 text-[#1A1626]">
                        <p><span className="font-semibold text-[#140249]">Fakturamåte:</span> {invoiceDeliveryLabel(entry.application.invoice_delivery_method)}</p>
                        <p><span className="font-semibold text-[#140249]">Faktura e-post:</span> {entry.application.invoice_email ?? "—"}</p>
                        <p><span className="font-semibold text-[#140249]">Fakturareferanse:</span> {entry.application.invoice_reference ?? "—"}</p>
                        <p><span className="font-semibold text-[#140249]">Ønsket pakke:</span> {entry.requestedPackage?.public_name ?? entry.requestedPackage?.mapped_package ?? "—"}</p>
                        <p><span className="font-semibold text-[#140249]">Godkjent pakke:</span> {entry.approvedPackage?.public_name ?? entry.approvedPackage?.mapped_package ?? "—"}</p>
                        <p><span className="font-semibold text-[#140249]">Ønsket stand:</span> {entry.requestedStand?.stand_code ?? "—"}</p>
                        <p><span className="font-semibold text-[#140249]">Godkjent stand:</span> {entry.approvedStand?.stand_code ?? "—"}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#D8CCE8] bg-white p-4 text-sm text-[#1A1626] shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#4F4568]">Rekruttering fra påmelding</p>
                      <div className="mt-3 grid gap-1.5 text-[#1A1626]">
                        <p><span className="font-semibold text-[#140249]">Nivå:</span> {candidateLevelLabel(entry.application.candidate_level)}</p>
                        <p><span className="font-semibold text-[#140249]">Studieretninger:</span> {joinValues(entry.application.candidate_fields)}</p>
                        <p><span className="font-semibold text-[#140249]">Andre studieretninger:</span> {entry.application.candidate_fields_other ?? "—"}</p>
                        <p><span className="font-semibold text-[#140249]">Standbehov:</span> {joinValues(entry.application.stand_needs)}</p>
                        <p><span className="font-semibold text-[#140249]">Andre standbehov:</span> {entry.application.stand_needs_other ?? "—"}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#D8CCE8] bg-white p-4 text-sm text-[#1A1626] shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#4F4568]">Portal og vedlegg</p>
                      <div className="mt-3 grid gap-2">
                        <div>
                          <p className="font-semibold text-[#140249]">Portal e-poster</p>
                          {entry.portalEmails.length === 0 ? (
                            <p className="mt-1 text-sm text-[#615679]">Ingen registrerte portaladresser.</p>
                          ) : (
                            <ul className="mt-2 grid gap-2">
                              {entry.portalEmails.map((portalEmail) => (
                                <li key={portalEmail.id} className="rounded-xl border border-[#D8CCE8] bg-[#F7F3FF] px-3 py-2 text-sm text-[#1A1626]">
                                  {portalEmail.email}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <p><span className="font-semibold text-[#140249]">Logo:</span> {entry.logoUrl ? <a className="font-semibold text-[#140249] underline underline-offset-2" href={entry.logoUrl} target="_blank" rel="noreferrer">Åpne opplastet logo</a> : "Ingen logo lastet opp"}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#D8CCE8] bg-white p-4 text-sm text-[#1A1626] shadow-sm xl:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#4F4568]">Notater fra påmeldingen</p>
                      <p className="mt-3 whitespace-pre-wrap leading-6 text-[#1A1626]">
                        {entry.application.notes ?? "Ingen notater sendt inn."}
                      </p>
                      {entry.application.rejection_reason ? (
                        <p className="mt-3 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
                          <span className="font-semibold">Avslagsgrunn:</span> {entry.application.rejection_reason}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-primary">Portaltilganger</h3>
          <p className="text-sm text-ink/70">
            Her ser du hvilke e-postadresser som har tilgang til bedriftsportalen, hva som venter på godkjenning og invite-historikken fra registrering.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-[#CDBEE8] bg-[#F7F3FF] p-4 text-[#1A1626]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-bold text-[#140249]">Aktive brukere</h4>
              <Badge variant="success">{portalAccess.activeUsers.length}</Badge>
            </div>
            {portalAccess.activeUsers.length === 0 ? (
              <p className="text-sm text-[#30224F]">Ingen godkjente portalbrukere ennå.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {portalAccess.activeUsers.map((user) => (
                  <li key={user.id} className="rounded-xl border border-[#D7CBEA] bg-white px-3 py-3 text-[#1A1626] shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#140249]">{user.fullName ?? user.email ?? "Bruker"}</p>
                        <p className="text-sm text-[#30224F]">{user.email ?? "Fant ikke e-post"}</p>
                      </div>
                      <Badge variant="success">Godkjent</Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-[#4F4568]">
                      <p>Rolle: {user.role || "member"}</p>
                      <p>Godkjent: {formatDateTime(user.approved_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-[#CDBEE8] bg-[#F7F3FF] p-4 text-[#1A1626]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-bold text-[#140249]">Venter på godkjenning</h4>
              <Badge variant="warning">{portalAccess.pendingRequests.length}</Badge>
            </div>
            {portalAccess.pendingRequests.length === 0 ? (
              <p className="text-sm text-[#30224F]">Ingen ventende tilgangsforespørsler.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {portalAccess.pendingRequests.map((request) => (
                  <li key={request.id} className="rounded-xl border border-[#D7CBEA] bg-white px-3 py-3 text-[#1A1626] shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#140249]">{request.fullName ?? request.email}</p>
                        <p className="text-sm text-[#30224F]">{request.email}</p>
                      </div>
                      <Badge variant="warning">Venter</Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-[#4F4568]">
                      <p>Domene: {request.domain || "—"}</p>
                      <p>Registrert: {formatDateTime(request.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-[#CDBEE8] bg-[#F7F3FF] p-4 text-[#1A1626]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-bold text-[#140249]">Invite-historikk</h4>
              <Badge variant="info">{portalAccess.portalInvites.length}</Badge>
            </div>
            {portalAccess.portalInvites.length === 0 ? (
              <p className="text-sm text-[#30224F]">Ingen portalinvitasjoner funnet for denne bedriften.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {portalAccess.portalInvites.map((invite) => (
                  <li key={invite.id} className="rounded-xl border border-[#D7CBEA] bg-white px-3 py-3 text-[#1A1626] shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#140249]">{invite.fullName ?? invite.email}</p>
                        <p className="text-sm text-[#30224F]">{invite.email}</p>
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
                    <div className="mt-2 space-y-1 text-xs text-[#4F4568]">
                      <p>Invitert: {formatDateTime(invite.invited_at ?? invite.created_at)}</p>
                      <p>Akseptert: {formatDateTime(invite.accepted_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="text-xs text-[#4F4568]">
          Trenger du å godkjenne en ny bruker? Gå til{" "}
          <Link className="font-semibold text-[#140249] underline underline-offset-2 hover:text-[#D46839]" href="/admin/companies/register#tilgangsforesporsler">
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
