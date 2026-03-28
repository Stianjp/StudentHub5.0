/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { SectionHeader } from "@/components/ui/section-header";
import { requireRole } from "@/lib/auth";
import { getAdminRegistrationApplicationDetail } from "@/lib/event-registration";
import {
  approveRegistrationApplicationAction,
  rejectRegistrationApplicationAction,
  resendCompanyPortalInviteAction,
  updateApprovedRegistrationStandAction,
} from "@/app/admin/event-registration-actions";

type PageProps = {
  params: Promise<{ eventId: string; campaignId: string; applicationId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function statusLabel(status: string) {
  if (status === "approved") return "Godkjent";
  if (status === "rejected") return "Avslått";
  return "Venter";
}

function statusClass(status: string) {
  if (status === "approved") return "bg-success/15 text-success";
  if (status === "rejected") return "bg-error/15 text-error";
  return "bg-secondary/20 text-primary";
}

function automationPillClass(active: boolean) {
  return active ? "bg-success/15 text-success" : "bg-primary/10 text-primary/70";
}

export default async function AdminRegistrationApplicationPage({ params, searchParams }: PageProps) {
  await requireRole("admin");
  const { eventId, campaignId, applicationId } = await params;
  const search = (await (searchParams ?? Promise.resolve({}))) as Record<string, string | string[] | undefined>;
  const saved = search.saved === "1";
  const errorMessage = typeof search.error === "string" ? decodeURIComponent(search.error) : "";
  const detail = await getAdminRegistrationApplicationDetail(applicationId);
  const returnTo = `/admin/events/${eventId}/registration/${campaignId}/applications/${applicationId}`;
  const requestedStand = detail.stands.find((stand) => stand.id === detail.application.requested_stand_id) ?? null;
  const approvedStand = detail.stands.find((stand) => stand.id === detail.application.approved_stand_id) ?? null;
  const defaultPackageId = detail.application.approved_package_id ?? detail.application.requested_package_id ?? "";
  const defaultStandId = detail.application.approved_stand_id ?? detail.application.requested_stand_id ?? "";
  const approvedStandOptions = detail.approvedPackage?.mapped_package
    ? detail.stands.filter(
        (stand) =>
          stand.package_tier === detail.approvedPackage?.mapped_package &&
          (stand.assigned_application_id === detail.application.id || (!stand.assigned_application_id && stand.status === "available")),
      )
    : [];
  const registrationLead = detail.automationStatus.crmEntries.find(
    (entry) => entry.lead_id === detail.automationStatus.registrationLeadId,
  );
  const crmSignedCount = detail.automationStatus.crmEntries.filter((entry) => entry.company_status === "Påmeldt").length;
  const registrationNotificationSent = Boolean(detail.automationStatus.registrationNotificationLog);
  const registrationConfirmationSent = Boolean(detail.automationStatus.registrationConfirmationLog);
  const packageGroupReady = Boolean(detail.automationStatus.packageGroupMembership);
  const portalInvitesReady =
    detail.invites.length > 0 && detail.invites.every((invite) => invite.status === "invited" || invite.status === "accepted");

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Søknad"
        title={detail.application.company_name}
        description="Gjennomgå søknaden, overstyr pakke eller stand ved behov, og godkjenn eller avslå."
        actions={
          <div className="flex items-center gap-3">
            <Link className="text-sm font-semibold text-primary/70 transition hover:text-primary" href={`/admin/events/${eventId}/registration/${campaignId}`}>
              Tilbake til kampanje
            </Link>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(detail.application.status)}`}>
              {statusLabel(detail.application.status)}
            </span>
          </div>
        }
      />

      {saved ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">Oppdatering lagret.</Card>
      ) : null}
      {errorMessage ? (
        <Card className="border border-error/30 bg-error/10 text-sm text-error">{errorMessage}</Card>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card className="grid gap-4">
          <h3 className="text-lg font-bold text-primary">Kontakt og bedrift</h3>
          <div className="grid gap-3 md:grid-cols-2 text-sm text-ink/80">
            <p><span className="font-semibold text-primary">Kontakt:</span> {detail.application.contact_first_name} {detail.application.contact_last_name}</p>
            <p><span className="font-semibold text-primary">E-post:</span> {detail.application.contact_email}</p>
            <p><span className="font-semibold text-primary">Telefon:</span> {detail.application.contact_phone}</p>
            <p><span className="font-semibold text-primary">Tittel:</span> {detail.application.contact_job_title ?? "Ikke satt"}</p>
            <p><span className="font-semibold text-primary">Bedrift:</span> {detail.application.company_name}</p>
            <p><span className="font-semibold text-primary">Org.nr:</span> {detail.application.org_number}</p>
            <p><span className="font-semibold text-primary">Land:</span> {detail.application.country}</p>
            <p><span className="font-semibold text-primary">By:</span> {detail.application.city}</p>
            <p className="md:col-span-2"><span className="font-semibold text-primary">Adresse:</span> {detail.application.address}, {detail.application.postal_code}</p>
          </div>
        </Card>

        <Card className="grid gap-4">
          <h3 className="text-lg font-bold text-primary">Pakke og stand</h3>
          <div className="grid gap-3 text-sm text-ink/80">
            <p><span className="font-semibold text-primary">Requested package:</span> {detail.requestedPackage?.public_name ?? "Ikke satt"}</p>
            <p><span className="font-semibold text-primary">Requested stand:</span> {requestedStand?.stand_code ?? "Ikke valgt"}</p>
            <p><span className="font-semibold text-primary">Approved package:</span> {detail.approvedPackage?.public_name ?? "Ikke satt"}</p>
            <p><span className="font-semibold text-primary">Approved stand:</span> {approvedStand?.stand_code ?? "Ikke satt"}</p>
            <p><span className="font-semibold text-primary">Innsendt:</span> {new Date(detail.application.created_at).toLocaleString("nb-NO")}</p>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="grid gap-4">
          <h3 className="text-lg font-bold text-primary">Fakturainfo og målgruppe</h3>
          <div className="grid gap-3 text-sm text-ink/80">
            <p><span className="font-semibold text-primary">Invoice delivery:</span> {detail.application.invoice_delivery_method.toUpperCase()}</p>
            <p><span className="font-semibold text-primary">Invoice e-mail:</span> {detail.application.invoice_email ?? "Ikke satt"}</p>
            <p><span className="font-semibold text-primary">Invoice reference:</span> {detail.application.invoice_reference ?? "Ikke satt"}</p>
            <p><span className="font-semibold text-primary">Level:</span> {detail.application.candidate_level}</p>
            <p><span className="font-semibold text-primary">Studenter:</span> {detail.application.candidate_fields.join(", ") || "Ingen valgt"}</p>
            <p><span className="font-semibold text-primary">Andre fag:</span> {detail.application.candidate_fields_other ?? "Ikke satt"}</p>
            <p><span className="font-semibold text-primary">Standbehov:</span> {detail.application.stand_needs.join(", ") || "Ingen"}</p>
            <p><span className="font-semibold text-primary">Andre standbehov:</span> {detail.application.stand_needs_other ?? "Ikke satt"}</p>
            <p><span className="font-semibold text-primary">Notater:</span> {detail.application.notes ?? "Ingen notater"}</p>
          </div>
        </Card>

        <Card className="grid gap-4">
          <h3 className="text-lg font-bold text-primary">Portalbrukere og logo</h3>
          <div className="grid gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">Portal e-poster</p>
              <div className="mt-2 grid gap-2">
                {detail.portalEmails.map((portalEmail) => (
                  <div key={portalEmail.id} className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-ink/80">
                    {portalEmail.email}
                  </div>
                ))}
              </div>
            </div>
            {detail.logoUrl ? (
              <div>
                <p className="text-sm font-semibold text-primary">Opplastet logo</p>
                <img
                  src={detail.logoUrl}
                  alt={`Logo for ${detail.application.company_name}`}
                  className="mt-3 max-h-48 rounded-2xl border border-primary/10 bg-white p-4"
                />
              </div>
            ) : (
              <p className="text-sm text-ink/70">Ingen logo lastet opp.</p>
            )}
          </div>
        </Card>
      </section>

      <Card className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-primary">Automatisering og integrasjoner</h3>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${automationPillClass(Boolean(registrationLead))}`}>
            {registrationLead ? "CRM synket" : "CRM mangler"}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm text-ink/80">
            <p className="font-semibold text-primary">CRM</p>
            <p className="mt-1">Registreringslead: {registrationLead ? registrationLead.company_status : "Ikke funnet"}</p>
            <p>Matchende CRM-rader: {detail.automationStatus.crmEntries.length}</p>
            <p>Påmeldt-rader: {crmSignedCount}</p>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm text-ink/80">
            <p className="font-semibold text-primary">Internt varsel</p>
            <p className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${automationPillClass(registrationNotificationSent)}`}>
              {registrationNotificationSent ? "Logget" : "Ikke logget"}
            </p>
            <p className="mt-2 text-xs text-ink/60">
              {detail.automationStatus.registrationNotificationLog?.created_at
                ? `Sist sendt ${new Date(detail.automationStatus.registrationNotificationLog.created_at).toLocaleString("nb-NO")}`
                : "Ingen logg funnet"}
            </p>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm text-ink/80">
            <p className="font-semibold text-primary">Kontaktbekreftelse</p>
            <p className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${automationPillClass(registrationConfirmationSent)}`}>
              {registrationConfirmationSent ? "Logget" : "Ikke logget"}
            </p>
            <p className="mt-2 text-xs text-ink/60">
              {detail.automationStatus.registrationConfirmationLog?.created_at
                ? `Sist sendt ${new Date(detail.automationStatus.registrationConfirmationLog.created_at).toLocaleString("nb-NO")}`
                : "Ingen logg funnet"}
            </p>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm text-ink/80">
            <p className="font-semibold text-primary">Pakkebasert e-postgruppe</p>
            <p className="mt-1">{detail.automationStatus.packageGroupName ?? "Ingen gruppe beregnet ennå"}</p>
            <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${automationPillClass(packageGroupReady)}`}>
              {packageGroupReady ? "Bedrift lagt til" : "Ikke tilordnet"}
            </p>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm text-ink/80">
            <p className="font-semibold text-primary">Portalinvitasjoner</p>
            <p className="mt-1">{detail.invites.length} opprettet</p>
            <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${automationPillClass(portalInvitesReady)}`}>
              {portalInvitesReady ? "Sendt" : "Venter / ikke opprettet"}
            </p>
          </div>
        </div>
      </Card>

      {detail.application.status === "pending" ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card className="grid gap-4">
            <h3 className="text-lg font-bold text-primary">Godkjenn søknad</h3>
            <form action={approveRegistrationApplicationAction} className="grid gap-3">
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="campaignId" value={campaignId} />
              <input type="hidden" name="applicationId" value={applicationId} />
              <input type="hidden" name="slug" value={detail.campaign.slug} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <label className="text-sm font-semibold text-primary">
                Approved package
                <Select name="approvedPackageId" required defaultValue={defaultPackageId}>
                  <option value="">Velg pakke</option>
                  {detail.packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.public_name} {pkg.mapped_package ? `(${pkg.mapped_package})` : "(manual)"}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="text-sm font-semibold text-primary">
                Approved stand
                <Select name="approvedStandId" defaultValue={defaultStandId}>
                  <option value="">Ingen stand</option>
                  {detail.stands.map((stand) => (
                    <option key={stand.id} value={stand.id}>
                      {stand.stand_code} · {stand.package_tier} · {stand.status}
                    </option>
                  ))}
                </Select>
              </label>
              <Button type="submit">Godkjenn søknad</Button>
            </form>
          </Card>

          <Card className="grid gap-4">
            <h3 className="text-lg font-bold text-primary">Avslå søknad</h3>
            <form action={rejectRegistrationApplicationAction} className="grid gap-3">
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="campaignId" value={campaignId} />
              <input type="hidden" name="applicationId" value={applicationId} />
              <input type="hidden" name="slug" value={detail.campaign.slug} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <label className="text-sm font-semibold text-primary">
                Begrunnelse
                <Textarea name="rejectionReason" rows={5} placeholder="Valgfri intern eller ekstern begrunnelse" />
              </label>
              <Button type="submit" variant="danger">Avslå søknad</Button>
            </form>
          </Card>
        </section>
      ) : null}

      {detail.application.status === "approved" ? (
        <Card className="grid gap-4">
          <div>
            <h3 className="text-lg font-bold text-primary">Oppdater standplass</h3>
            <p className="text-sm text-ink/70">
              Endrer du stand her, frigjøres forrige stand automatisk på kartet og bedriften oppdateres med ny standkode.
            </p>
          </div>
          <form action={updateApprovedRegistrationStandAction} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="campaignId" value={campaignId} />
            <input type="hidden" name="applicationId" value={applicationId} />
            <input type="hidden" name="slug" value={detail.campaign.slug} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <label className="text-sm font-semibold text-primary">
              Godkjent standplass
              <Select name="approvedStandId" defaultValue={detail.application.approved_stand_id ?? ""}>
                <option value="">Ingen stand</option>
                {approvedStandOptions.map((stand) => (
                  <option key={stand.id} value={stand.id}>
                    {stand.stand_code} · {stand.package_tier} · {stand.status}
                  </option>
                ))}
              </Select>
            </label>
            <Button type="submit" variant="secondary">
              Lagre standplass
            </Button>
          </form>
        </Card>
      ) : null}

      <Card className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-primary">Invitasjoner til bedriftsportalen</h3>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {detail.invites.length} opprettet
          </span>
        </div>
        {detail.invites.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen invitasjoner er sendt ennå. Disse opprettes når søknaden godkjennes.</p>
        ) : (
          <div className="grid gap-3">
            {detail.invites.map((invite) => (
              <div key={invite.id} className="flex flex-col gap-3 rounded-2xl border border-primary/10 bg-primary/5 p-4 md:flex-row md:items-center md:justify-between">
                <div className="grid gap-1 text-sm text-ink/80">
                  <p className="font-semibold text-primary">{invite.email}</p>
                  <p>Status: {invite.status}</p>
                  <p>Invitert: {invite.invited_at ? new Date(invite.invited_at).toLocaleString("nb-NO") : "Ikke sendt"}</p>
                  <p>Akseptert: {invite.accepted_at ? new Date(invite.accepted_at).toLocaleString("nb-NO") : "Ikke akseptert"}</p>
                </div>
                {invite.status !== "accepted" ? (
                  <form action={resendCompanyPortalInviteAction}>
                    <input type="hidden" name="eventId" value={eventId} />
                    <input type="hidden" name="campaignId" value={campaignId} />
                    <input type="hidden" name="inviteId" value={invite.id} />
                    <input type="hidden" name="slug" value={detail.campaign.slug} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <Button type="submit" variant="secondary">Send på nytt</Button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
