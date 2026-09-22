import { roleFromHost, type AppRole } from "@/lib/host";

export type OAuthPortalRole = Extract<AppRole, "student" | "company">;

const PORTAL_PREFIXES: Record<OAuthPortalRole, string> = {
  student: "/student",
  company: "/company",
};

export function resolveOAuthPortalRole(
  host: string | null,
  requestedRole?: string | null,
  allowLocalFallback = process.env.NODE_ENV !== "production",
): OAuthPortalRole | null {
  const hostRole = roleFromHost(host);
  if (hostRole === "student" || hostRole === "company") return hostRole;
  if (
    allowLocalFallback &&
    (requestedRole === "student" || requestedRole === "company")
  ) {
    return requestedRole;
  }
  return null;
}

export function getSafePortalNextPath(
  value: string | null | undefined,
  role: OAuthPortalRole,
) {
  const fallback = role === "student" ? "/student/dashboard" : "/company";
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;

  const prefix = PORTAL_PREFIXES[role];
  if (value !== prefix && !value.startsWith(`${prefix}/`) && !value.startsWith(`${prefix}?`)) {
    return fallback;
  }
  return value;
}

export function isStudentOnboardingComplete(student: {
  full_name?: string | null;
  school?: string | null;
  study_program?: string | null;
  study_level?: string | null;
  study_year?: number | null;
} | null) {
  return Boolean(
    student?.full_name?.trim() &&
      student.school?.trim() &&
      student.study_program?.trim() &&
      student.study_level?.trim() &&
      student.study_year,
  );
}
