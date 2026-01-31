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

export function getDefaultNextPath(role: Role) {
  if (role === "admin") return "/admin";
  if (role === "company") return "/company";
  if (process.env.NEXT_PUBLIC_STUDENT_APP_URL) return "/";
  return "/student";
}
