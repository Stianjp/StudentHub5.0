import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { updateCompanyPackageSettings } from "@/app/admin/actions";
import {
  hasLeadDetailsAccessForRegistration,
  hasRoiAccessForRegistration,
} from "@/lib/company";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function packageLabel(pkg?: string | null) {
  if (!pkg) return "ikke satt";
  if (pkg === "standard") return "Standard";
  if (pkg === "silver") return "Sølv";
  if (pkg === "gold") return "Gull";
  if (pkg === "platinum") return "Platinum";
  return pkg;
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default async function AdminCompanyPackagesPage({ searchParams }: PageProps) {
  await requireRole("admin");
  const params = await searchParams;
  const saved = params.saved === "1";
  const errorMessage = typeof params.error === "string" ? params.error : "";
  const selectedEventId = typeof params.eventId === "string" ? params.eventId : "all";
  const returnTo =
    selectedEventId !== "all"
      ? `/admin/company-packages?eventId=${selectedEventId}`
      : "/admin/company-packages";

  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient();
  } catch {
    // fallback
  }

  const eventsQuery = supabase.from("events").select("id, name, starts_at").order("starts_at", { ascending: false });
  let registrationsQuery = supabase
    .from("event_companies")
    .select(
      "id, event_id, company_id, stand_type, package, can_view_roi, can_view_leads, extra_attendee_tickets, access_from, access_until, updated_at, company:companies(id, name), event:events(id, name, starts_at)",
    )
    .order("created_at", { ascending: false });

  if (selectedEventId !== "all") {
    registrationsQuery = registrationsQuery.eq("event_id", selectedEventId);
  }

  const [{ data: events, error: eventsError }, { data: registrations, error: registrationsError }] =
    await Promise.all([eventsQuery, registrationsQuery]);
  if (eventsError) throw eventsError;
  if (registrationsError) throw registrationsError;

  const rows = (registrations ?? []) as unknown as Array<{
    id: string;
    event_id: string;
    package: "standard" | "silver" | "gold" | "platinum";
    stand_type: string | null;
    can_view_roi: boolean;
    can_view_leads: boolean;
    extra_attendee_tickets: number;
    access_from: string | null;
    access_until: string | null;
    updated_at: string;
    company?: { id: string; name: string } | null;
    event?: { id: string; name: string; starts_at: string } | null;
  }>;

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Bedriftspakker"
        title="Styr pakke og tilgang per event"
        description="Dette er hovedstedet for standtype, pakke og ekstra tilgang (ROI/Leads)."
        actions={<Link className="button-link text-xs" href="/admin/events/overview">Eventoversikt</Link>}
      />

      {saved ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">
          Endringer lagret.
        </Card>
      ) : null}
      {errorMessage ? (
        <Card className="border border-error/30 bg-error/10 text-sm text-error">
          {decodeURIComponent(errorMessage)}
        </Card>
      ) : null}

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Filter</h3>
        <form className="grid gap-3 md:grid-cols-3" method="get">
          <label className="text-sm font-semibold text-primary">
            Event
            <Select name="eventId" defaultValue={selectedEventId}>
              <option value="all">Alle events</option>
              {(events ?? []).map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </Select>
          </label>
          <div className="md:col-span-3">
            <Button type="submit" variant="secondary">
              Oppdater filter
            </Button>
          </div>
        </form>
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Registreringer</h3>
        {rows.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen bedrifter registrert på valgt event.</p>
        ) : (
          <ul className="grid gap-3">
            {rows.map((row) => {
              const hasRoiAccess = hasRoiAccessForRegistration(row);
              const hasLeadAccess = hasLeadDetailsAccessForRegistration(row);
              return (
                <li key={row.id} className="rounded-xl border border-primary/10 bg-primary/5 p-4">
                  <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-primary">{row.company?.name ?? "Bedrift"}</p>
                      <p className="text-xs text-ink/70">
                        {row.event?.name ?? "Event"} • {new Date(row.event?.starts_at ?? row.updated_at).toLocaleDateString("nb-NO")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-secondary/20 px-3 py-1 text-primary">
                        Pakke: {packageLabel(row.package)}
                      </span>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                        ROI: {hasRoiAccess ? "Ja" : "Nei"}
                      </span>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                        Leads: {hasLeadAccess ? "Ja" : "Nei"}
                      </span>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                        Ekstra billetter: +{row.extra_attendee_tickets ?? 0}
                      </span>
                    </div>
                  </div>

                  <form action={updateCompanyPackageSettings} className="grid gap-3 md:grid-cols-3">
                    <input type="hidden" name="registrationId" value={row.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />

                    <label className="text-sm font-semibold text-primary">
                      Pakke
                      <Select name="package" defaultValue={row.package}>
                        <option value="standard">Standard</option>
                        <option value="silver">Sølv</option>
                        <option value="gold">Gull</option>
                        <option value="platinum">Platinum</option>
                      </Select>
                    </label>

                    <label className="text-sm font-semibold text-primary">
                      Standtype
                      <Select name="standType" defaultValue={row.stand_type ?? "Standard"}>
                        <option value="Standard">Standard</option>
                        <option value="Premium">Premium</option>
                      </Select>
                    </label>

                    <div className="grid gap-2">
                      <label className="flex items-center gap-2 rounded-xl border border-primary/10 bg-surface px-3 py-2 text-sm font-semibold text-primary">
                        <input type="checkbox" name="canViewRoi" defaultChecked={Boolean(row.can_view_roi)} />
                        Ekstra: Skal kunne se ROI
                      </label>
                      <label className="flex items-center gap-2 rounded-xl border border-primary/10 bg-surface px-3 py-2 text-sm font-semibold text-primary">
                        <input type="checkbox" name="canViewLeads" defaultChecked={Boolean(row.can_view_leads)} />
                        Ekstra: Skal kunne se Leads
                      </label>
                    </div>

                    <label className="text-sm font-semibold text-primary">
                      Ekstra ansattbilletter
                      <Input
                        name="extraAttendeeTickets"
                        type="number"
                        min={0}
                        step={1}
                        defaultValue={String(row.extra_attendee_tickets ?? 0)}
                      />
                    </label>

                    <label className="text-sm font-semibold text-primary">
                      Tilgang fra (valgfritt)
                      <Input name="accessFrom" type="datetime-local" defaultValue={toDateTimeLocal(row.access_from)} />
                    </label>
                    <label className="text-sm font-semibold text-primary">
                      Tilgang til (valgfritt)
                      <Input name="accessUntil" type="datetime-local" defaultValue={toDateTimeLocal(row.access_until)} />
                    </label>

                    <div className="flex items-end">
                      <Button type="submit" variant="secondary">Lagre pakke</Button>
                    </div>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
