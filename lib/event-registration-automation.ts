import type { TableRow } from "@/lib/types/database";

type RegistrationPackage = TableRow<"event_registration_packages">;

const PACKAGE_GROUP_LABELS: Record<NonNullable<RegistrationPackage["mapped_package"]>, string> = {
  standard: "Standard",
  silver: "Silver",
  gold: "Gull",
  platinum: "Platinum",
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getRegistrationPackageGroupLabel(
  packageTier: RegistrationPackage["mapped_package"] | null | undefined,
) {
  if (!packageTier) return null;
  return PACKAGE_GROUP_LABELS[packageTier] ?? null;
}

export function buildRegistrationPackageGroupName(
  prefix: string | null | undefined,
  packageTier: RegistrationPackage["mapped_package"] | null | undefined,
) {
  const trimmedPrefix = prefix?.trim();
  const tierLabel = getRegistrationPackageGroupLabel(packageTier);
  if (!trimmedPrefix || !tierLabel) return null;
  return `${trimmedPrefix}-${tierLabel}`;
}

export function buildRegistrationNotificationHtml(input: {
  companyName: string;
  eventName: string;
  packageName: string;
  contactName: string;
  contactEmail: string;
  applicationId: string;
}) {
  return `<p><strong>${escapeHtml(input.companyName)}</strong> har registrert seg for <strong>${escapeHtml(
    input.eventName,
  )}</strong>.</p>
<p>Pakke: <strong>${escapeHtml(input.packageName)}</strong></p>
<p>Kontaktperson: ${escapeHtml(input.contactName)} &lt;${escapeHtml(input.contactEmail)}&gt;</p>
<p>Application-ID: <code>${escapeHtml(input.applicationId)}</code></p>`;
}

export function buildRegistrationConfirmationHtml(input: {
  companyName: string;
  eventName: string;
  packageName: string;
  portalEmails: string[];
}) {
  const portalEmailItems = input.portalEmails
    .map((email) => `<li>${escapeHtml(email)}</li>`)
    .join("");

  return `<p>Hei,</p>
<p>Vi har mottatt registreringen fra <strong>${escapeHtml(input.companyName)}</strong> til <strong>${escapeHtml(
    input.eventName,
  )}</strong>.</p>
<p>Valgt pakke: <strong>${escapeHtml(input.packageName)}</strong></p>
<p>Adressene som er lagt inn under <strong>Portal access e-mails</strong> blir først invitert når OSH har godkjent søknaden.</p>
<p>Registrerte portaladresser:</p>
<ul>${portalEmailItems}</ul>
<p>Vi sender videre informasjon til kontaktpersonen når søknaden er behandlet.</p>`;
}
