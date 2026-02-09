import { PortalShell } from "@/components/layouts/portal-shell";
import { requireRole } from "@/lib/auth";

const nav = [
  { href: "/checkin", label: "Check-in" },
];

export default async function CheckinLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin");
  return (
    <PortalShell
      roleLabel="Check-in"
      roleKey="admin"
      title="Check-in"
      nav={nav}
      backgroundClass="bg-primary"
    >
      {children}
    </PortalShell>
  );
}
