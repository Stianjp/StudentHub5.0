import { defaultPathForRole } from "@/lib/host";
import type { StudentAudience } from "@/lib/portal-audience";

type Role = "student" | "company" | "admin";

export function getBaseUrlForRole(role: Role, fallback?: string) {
  const roleBase =
    role === "student"
      ? process.env.NEXT_PUBLIC_STUDENT_APP_URL
      : role === "company"
        ? process.env.NEXT_PUBLIC_COMPANY_APP_URL
        : process.env.NEXT_PUBLIC_ADMIN_APP_URL;

  return roleBase || process.env.NEXT_PUBLIC_APP_URL || fallback || "";
}

export function getBaseUrlForStudentAudience(audience: StudentAudience, fallback?: string) {
  if (audience === "young_professional") {
    return (
      process.env.NEXT_PUBLIC_YOUNG_PROFESSIONAL_APP_URL ||
      fallback ||
      process.env.NEXT_PUBLIC_STUDENT_APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      ""
    );
  }

  return getBaseUrlForRole("student", fallback);
}

export function getDefaultNextPath(role: Role, hostname?: string | null) {
  return defaultPathForRole(role, hostname);
}
