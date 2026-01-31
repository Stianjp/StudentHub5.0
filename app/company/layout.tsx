import { PortalShell } from "@/components/layouts/portal-shell";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCompanyAccessStatus, getOrCreateCompanyForUser } from "@/lib/company";

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
  const accessStatus = user ? await getCompanyAccessStatus(user.id) : { status: "missing" as const };

  if (!company) {
    return (
      <PortalShell roleLabel="Bedrift" roleKey="company" title="Tilgang under behandling" nav={nav}>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-3xl border border-white/10 bg-primary/60 p-6 text-surface">
          <h2 className="text-xl font-bold">Bedriftskonto ikke godkjent ennå</h2>
          <p className="text-sm text-surface/80">
            Vi har registrert forespørselen din. En admin må godkjenne tilgang før du kan bruke bedriftsportalen.
          </p>
          {accessStatus.status === "pending" ? (
            <div className="rounded-2xl border border-secondary/40 bg-secondary/10 p-4 text-sm">
              <p><span className="font-semibold">E-post:</span> {accessStatus.email}</p>
              <p><span className="font-semibold">Domene:</span> {accessStatus.domain}</p>
              <p><span className="font-semibold">Opprettet:</span> {new Date(accessStatus.createdAt ?? "").toLocaleString("nb-NO")}</p>
              {!accessStatus.companyId ? (
                <p className="mt-2 text-surface/80">
                  Vi fant ingen eksisterende bedrift på domenet ditt. En admin vil knytte deg til riktig bedrift
                  eller opprette en ny.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-surface/70">
              Ingen forespørsel er registrert. Registrer bedriften din eller kontakt OSH-teamet om du trenger hjelp.
            </p>
          )}
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell roleLabel="Bedrift" roleKey="company" title={title} nav={nav}>
      {children}
    </PortalShell>
  );
}
