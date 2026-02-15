import { PortalShell } from "@/components/layouts/portal-shell";
import { requireRole } from "@/lib/auth";

const nav = [
  { href: "/admin", label: "Oversikt" },
  {
    href: "/admin/companies",
    label: "Bedrifter",
    children: [
      { href: "/admin/companies/register", label: "Registrer en bedrift" },
      { href: "/admin/companies/register-event", label: "Registrer bedrift til event" },
      { href: "/admin/companies/overview", label: "Oversikt bedrifter" },
    ],
  },
  {
    href: "/admin/events",
    label: "Events",
    children: [
      { href: "/admin/events/new", label: "Registrer nytt event" },
      { href: "/admin/events/overview", label: "Oversikt over eventer" },
    ],
  },
  { href: "/admin/company-packages", label: "Bedriftspakker" },
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
      backgroundStyle={{ backgroundImage: "linear-gradient(135deg, #140249 0%, #FE9A70 100%)" }}
      mainClass="admin-scope"
    >
      {children}
    </PortalShell>
  );
}
