import { roleFromHost, type AppRole } from "@/lib/host";

export const OSH_ADMIN_EMAIL_DOMAIN = "@oslostudenthub.no";
export const PASSWORD_POLICY_MESSAGE =
  "Passord må være minst 8 tegn og inneholde stor bokstav, tall og spesialtegn.";

export const STUDENT_JOB_TYPE_OPTIONS = [
  { value: "Deltidsjobb", label: "Deltidsjobb" },
  { value: "Fast jobb", label: "Fulltidsjobb" },
  { value: "Bacheloroppgave", label: "Bacheloroppgave" },
  { value: "Masteroppgave", label: "Masteroppgave" },
  { value: "Sommerjobb", label: "Sommerjobb" },
] as const;

const STUDENT_JOB_TYPE_ALIASES = new Map<string, string>(
  STUDENT_JOB_TYPE_OPTIONS.flatMap((option) => {
    const aliases = [option.value, option.label];
    if (option.value === "Fast jobb") {
      aliases.push("Fulltidsjobb");
    }
    return aliases.map((alias) => [alias.trim().toLowerCase(), option.value]);
  }),
);

export function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase();
}

export function isOshAdminEmail(value: string | null | undefined) {
  if (!value) return false;
  return normalizeEmailAddress(value).endsWith(OSH_ADMIN_EMAIL_DOMAIN);
}

export function validatePasswordStrength(password: string, confirmPassword?: string | null) {
  if (password.length < 8) {
    return PASSWORD_POLICY_MESSAGE;
  }
  if (!/[A-ZÆØÅ]/.test(password)) {
    return PASSWORD_POLICY_MESSAGE;
  }
  if (!/\d/.test(password)) {
    return PASSWORD_POLICY_MESSAGE;
  }
  if (!/[^\p{L}\p{N}\s]/u.test(password)) {
    return PASSWORD_POLICY_MESSAGE;
  }
  if (confirmPassword !== undefined && confirmPassword !== null && password !== confirmPassword) {
    return "Passordene må være like.";
  }
  return null;
}

export function mapStudentJobTypes(values: string[]) {
  const normalized = values
    .map((value) => STUDENT_JOB_TYPE_ALIASES.get(value.trim().toLowerCase()) ?? null)
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(normalized));
}

export function validateHostRoleLock(hostname: string | null | undefined, expectedRole: Exclude<AppRole, "admin">) {
  const hostRole = roleFromHost(hostname ?? null);
  if (!hostRole) return null;
  if (hostRole === "admin") {
    return "Registrering er ikke tilgjengelig på admin-domenet.";
  }
  if (hostRole !== expectedRole) {
    return expectedRole === "student"
      ? "Studentregistrering kan bare brukes på student-domenet."
      : "Bedriftsregistrering kan bare brukes på bedrift-domenet.";
  }
  return null;
}

export function validateMagicLinkRoleForHost(hostname: string | null | undefined, requestedRole: AppRole) {
  const hostRole = roleFromHost(hostname ?? null);
  if (!hostRole) return null;
  if (hostRole === "admin") {
    return "Magic link er ikke tilgjengelig på admin-domenet.";
  }
  if (hostRole !== requestedRole) {
    return hostRole === "student"
      ? "Dette domenet støtter bare student-innlogging."
      : "Dette domenet støtter bare bedriftsinnlogging.";
  }
  return null;
}
