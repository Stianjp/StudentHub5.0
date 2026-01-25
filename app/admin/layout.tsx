import { PortalShell } from "@/components/layouts/portal-shell";
import { requireRole } from "@/lib/auth";

const nav = [
  { href: "/admin", label: "Oversikt" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/companies", label: "Bedrifter" },
];

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin");

  return (
    <PortalShell roleLabel="Admin" title="OSH Admin" nav={nav}>
      {children}
    </PortalShell>
  );
}
