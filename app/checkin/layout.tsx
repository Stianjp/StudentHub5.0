import { PortalShell } from "@/components/layouts/portal-shell";

const nav = [
  { href: "/checkin", label: "Check-in" },
];

export default function CheckinLayout({ children }: { children: React.ReactNode }) {
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
