import { PortalShell } from "@/components/layouts/portal-shell";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateCompanyForUser } from "@/lib/company";

const nav = [
  { href: "/company/onboarding", label: "Registrering" },
  { href: "/company", label: "Dashboard" },
  { href: "/company/events", label: "Events" },
  { href: "/company/leads", label: "Leads" },
  { href: "/company/roi", label: "ROI" },
];

export const dynamic = "force-dynamic";

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("company");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const company = user ? await getOrCreateCompanyForUser(profile.id, user.email) : null;
  const title = company?.name ?? "Bedriftsportal";

  return (
    <PortalShell roleLabel="Bedrift" roleKey="company" title={title} nav={nav}>
      {children}
    </PortalShell>
  );
}
