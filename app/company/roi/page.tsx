import Link from "next/link";
import { AiSummary } from "@/components/company/ai-summary";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Stat } from "@/components/ui/stat";
import { requireRole } from "@/lib/auth";
import {
  getCompanyRegistrations,
  getOrCreateCompanyForUser,
  getRoiMetrics,
  hasPlatinumAccess,
} from "@/lib/company";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type RoiPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const UPGRADE_CONTACT_COPY =
  "Ta kontakt med stian@oslostudenthub.no eller amruta@oslostudenthub.no for å få kjøpe og aktivere tilleggspakkene: ROI og/eller Leads.";

export default async function CompanyRoiPage({ searchParams }: RoiPageProps) {
  const params = await searchParams;
  const profile = await requireRole("company");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");

  const company = await getOrCreateCompanyForUser(profile.id, user.email);
  const companyId = company?.id;
  if (!company || !companyId) {
    return (
      <Card className="border border-warning/30 bg-warning/10 text-sm text-ink/90">
        Bedriftskontoen din er ikke godkjent ennå. En admin må godkjenne tilgang før du kan se ROI.
      </Card>
    );
  }
  const registrations = await getCompanyRegistrations(companyId);

  if (registrations.length === 0) {
    return (
      <Card>
        <SectionHeader title="ROI" description="Ingen eventpåmeldinger funnet." />
        <p className="mt-2 text-sm text-ink/80">Meld dere på et event først.</p>
        <Link
          className={cn(
            "mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-surface transition hover:bg-primary/90",
          )}
          href="/company"
        >
          Gå til påmelding
        </Link>
      </Card>
    );
  }

  const requestedEventId = typeof params.eventId === "string" ? params.eventId : registrations[0].event_id;
  const currentRegistration = registrations.find((reg) => reg.event_id === requestedEventId) ?? registrations[0];

  const hasRoiAccess = await hasPlatinumAccess(profile.id, currentRegistration.event_id, companyId);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="ROI"
        title="ROI og innsikt"
        description="Kun tilgjengelig for Gull og Platinum med gyldig tilgangsperiode per event."
        tone="light"
        actions={
          <div className="flex flex-wrap gap-2">
            {registrations.map((reg) => (
              <Link
                key={reg.id}
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                  reg.event_id === currentRegistration.event_id
                    ? "border-secondary bg-secondary/12 text-surface"
                    : "border-white/18 bg-white/10 text-surface/86 hover:border-secondary/60 hover:text-surface",
                )}
                href={`/company/roi?eventId=${reg.event_id}`}
              >
                {reg.event.name}
              </Link>
            ))}
          </div>
        }
      />

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">{currentRegistration.event.name}</p>
            <p className="text-xs text-ink/70">
              Pakke:{" "}
              {currentRegistration.package === "standard"
                ? "Standard"
                : currentRegistration.package === "silver"
                  ? "Sølv"
                  : currentRegistration.package === "gold"
                    ? "Gull"
                    : "Platinum"}
            </p>
          </div>
          <Badge
            variant={
              currentRegistration.package === "gold" || currentRegistration.package === "platinum"
                ? "success"
                : "warning"
            }
          >
            {currentRegistration.package}
          </Badge>
        </div>

        {!hasRoiAccess ? (
          <div className="company-light-surface rounded-xl border border-warning/30 bg-[#FFF6E8] p-4 text-sm text-[#1A1626]">
            <p className="font-semibold text-[#140249]">ROI er ikke tilgjengelig for denne pakken.</p>
            <p className="mt-2 font-semibold text-[#2D1C63]">{UPGRADE_CONTACT_COPY}</p>
          </div>
        ) : null}
      </Card>

      {hasRoiAccess ? <RoiContent eventId={currentRegistration.event_id} companyId={companyId} /> : null}
    </div>
  );
}

async function RoiContent({ eventId, companyId }: { eventId: string; companyId: string }) {
  const metrics = await getRoiMetrics(companyId, eventId);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Standbesøk" value={metrics.visitsCount} />
        <Stat label="Leads" value={metrics.leadsCount} />
        <Stat label="Konvertering" value={`${metrics.conversion}%`} hint="Besøk → lead" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-3 text-surface">
          <h3 className="text-lg font-bold text-surface">Top studieretninger</h3>
          {metrics.topStudyPrograms.length === 0 ? (
            <p className="text-sm text-surface/80">Ikke nok samtykkedata enda.</p>
          ) : (
            <ul className="grid gap-2 text-sm text-surface/88">
              {metrics.topStudyPrograms.map((item) => (
                <li key={item.program} className="flex items-center justify-between rounded-xl bg-white/8 px-3 py-2">
                  <span className="font-semibold text-surface">{item.program}</span>
                  <span className="text-xs font-semibold text-surface/80">{item.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-3 text-surface">
          <h3 className="text-lg font-bold text-surface">Målgruppe (bedriften)</h3>
          <div className="grid gap-2 text-sm text-surface/88">
            <div>
              <p className="font-semibold text-surface">Nivå</p>
              <p>{metrics.targetLevels.length > 0 ? metrics.targetLevels.join(", ") : "Ikke satt"}</p>
            </div>
            <div>
              <p className="font-semibold text-surface">Bachelor-år</p>
              <p>
                {metrics.targetYearsBachelor.length > 0
                  ? metrics.targetYearsBachelor.sort((a, b) => a - b).map((y) => `${y}. år`).join(", ")
                  : "Ikke satt"}
              </p>
            </div>
            <div>
              <p className="font-semibold text-surface">Master-år</p>
              <p>
                {metrics.targetYearsMaster.length > 0
                  ? metrics.targetYearsMaster.sort((a, b) => a - b).map((y) => `${y}. år`).join(", ")
                  : "Ikke satt"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-3 text-surface">
          <h3 className="text-lg font-bold text-surface">Besøk per tidspunkt</h3>
          {metrics.visitsByHour.length === 0 ? (
            <p className="text-sm text-surface/80">Ingen besøk registrert.</p>
          ) : (
            <ul className="grid gap-2 text-sm text-surface/88">
              {metrics.visitsByHour.map((item) => (
                <li key={item.hour} className="flex items-center justify-between rounded-xl bg-white/8 px-3 py-2">
                  <span className="font-semibold text-surface">
                    {new Date(item.hour).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-xs font-semibold text-surface/80">{item.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-3 text-surface">
          <h3 className="text-lg font-bold text-surface">Leads per nivå/år</h3>
          <div className="grid gap-3 text-sm text-surface/88">
            <div>
              <p className="font-semibold text-surface">Nivå</p>
              {metrics.leadsByLevel.length === 0 ? (
                <p>Ingen data.</p>
              ) : (
                <ul className="grid gap-2">
                  {metrics.leadsByLevel.map((item) => (
                    <li key={item.level} className="flex items-center justify-between rounded-xl bg-white/8 px-3 py-2">
                      <span className="font-semibold text-surface">{item.level}</span>
                      <span className="text-xs font-semibold text-surface/80">{item.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="font-semibold text-surface">Bachelor-år</p>
              {metrics.leadsByYearBachelor.length === 0 ? (
                <p>Ingen data.</p>
              ) : (
                <ul className="grid gap-2">
                  {metrics.leadsByYearBachelor.map((item) => (
                    <li
                      key={`bachelor-${item.year}`}
                      className="flex items-center justify-between rounded-xl bg-white/8 px-3 py-2"
                    >
                      <span className="font-semibold text-surface">{item.year}. år</span>
                      <span className="text-xs font-semibold text-surface/80">{item.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="font-semibold text-surface">Master-år</p>
              {metrics.leadsByYearMaster.length === 0 ? (
                <p>Ingen data.</p>
              ) : (
                <ul className="grid gap-2">
                  {metrics.leadsByYearMaster.map((item) => (
                    <li
                      key={`master-${item.year}`}
                      className="flex items-center justify-between rounded-xl bg-white/8 px-3 py-2"
                    >
                      <span className="font-semibold text-surface">{item.year}. år</span>
                      <span className="text-xs font-semibold text-surface/80">{item.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      </div>

      <AiSummary eventId={eventId} companyId={companyId} />
    </div>
  );
}
