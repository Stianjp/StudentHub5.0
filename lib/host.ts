export type AppRole = "student" | "company" | "admin";

export function roleFromHost(hostname: string | null): AppRole | null {
  if (!hostname) return null;
  const host = hostname.split(":")[0].toLowerCase();

  if (host.startsWith("student.")) return "student";
  if (host.startsWith("bedrift.")) return "company";
  if (host.startsWith("admin.")) return "admin";
  return null;
}

export function defaultPathForRole(role: AppRole) {
  if (role === "student") return "/student";
  if (role === "admin") return "/admin";
  return "/company";
}
