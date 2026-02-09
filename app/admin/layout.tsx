import { PortalShell } from "@/components/layouts/portal-shell";
import { requireRole } from "@/lib/auth";

const nav = [
  { href: "/admin", label: "Oversikt" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/companies", label: "Bedrifter" },
  { href: "/admin/students", label: "Studenter" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/tickets", label: "Billetter" },
];

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin");

  return (
    <PortalShell
      roleLabel="Admin"
      roleKey="admin"
      title="OSH Admin"
      nav={nav}
      backgroundClass="bg-gradient-to-br from-primary to-secondary"
    >
      {children}
    </PortalShell>
  );
}
