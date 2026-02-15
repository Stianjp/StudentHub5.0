export type AppRole = "student" | "company" | "admin";

export function roleFromHost(hostname: string | null): AppRole | null {
  if (!hostname) return null;
  const host = hostname.split(":")[0].toLowerCase();

  if (host.startsWith("student.")) return "student";
  if (host.startsWith("bedrift.")) return "company";
  if (host.startsWith("checkin.")) return "admin";
  if (host.startsWith("admin.")) return "admin";
  return null;
}

function isCheckinHost(hostname: string | null | undefined) {
  if (!hostname) return false;
  return hostname.split(":")[0].toLowerCase().startsWith("checkin.");
}

export function defaultPathForRole(role: AppRole, hostname?: string | null) {
  if (role === "student") return "/student";
  if (role === "admin") return isCheckinHost(hostname) ? "/checkin" : "/admin";
  return "/company";
}
