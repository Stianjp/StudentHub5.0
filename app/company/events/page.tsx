import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { cn } from "@/lib/utils";
import { requireRole } from "@/lib/auth";
import { getCompanyRegistrations, getOrCreateCompanyForUser } from "@/lib/company";
import { listActiveEvents } from "@/lib/events";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { registerCompanyAttendee, updateCompanyEventGoals } from "@/app/company/actions";

function packageVariant(pkg: string) {
  if (pkg === "platinum") return "success" as const;
  if (pkg === "gold") return "info" as const;
  if (pkg === "silver") return "warning" as const;
  return "default" as const;
}

function packageLabel(pkg: string) {
  if (pkg === "standard") return "Standard";
  if (pkg === "silver") return "Sølv";
  if (pkg === "gold") return "Gull";
  if (pkg === "platinum") return "Platinum";
  return pkg;
}

function isExternalHttpUrl(value: string | null | undefined) {
  if (!value) return false;
  return /^https?:\/\//i.test(value.trim());
}

export default async function CompanyEventsPage() {
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
        Bedriftskontoen din er ikke godkjent ennå. En admin må godkjenne tilgang før du kan se events.
      </Card>
    );
  }
  const [registrations, events] = await Promise.all([
    getCompanyRegistrations(companyId),
    listActiveEvents(),
  ]);

  const registeredEventIds = new Set(registrations.map((reg) => reg.event_id));
  const openEvents = events.filter((event) => !registeredEventIds.has(event.id));

  const goalOptions = [
    "Bygge employer branding",
    "Samle leads",
    "Promotere graduate-program",
    "Rekruttere til sommerjobb",
    "Få innsikt i studieretninger",
    "Booke intervjuer",
  ];
  const kpiOptions = [
    "Antall standbesøk",
    "Antall leads",
    "Konvertering (besøk -> lead)",
    "Topp studieretninger",
    "Besøk per tidspunkt",
  ];

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Events"
        title="Dine event-deltakelser"
        description="Pakke og premium-tilgang styres av OSH-admin per event."
        actions={
          <Link
            className={cn(
              "inline-flex items-center justify-center rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-secondary/90",
            )}
            href="/company"
          >
            Meld på nytt event
          </Link>
        }
      />

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Registrerte events</h3>
        {registrations.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen påmeldinger enda.</p>
        ) : (
          <div className="grid gap-3">
            {registrations.map((registration) => (
              <div key={registration.id} className="rounded-xl border border-primary/10 bg-primary/5 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-base font-semibold text-primary">{registration.event.name}</p>
                    <p className="text-xs text-ink/70">
                      {new Date(registration.event.starts_at).toLocaleString("nb-NO")} -{" "}
                      {new Date(registration.event.ends_at).toLocaleString("nb-NO")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={packageVariant(registration.package)}>
                      {packageLabel(registration.package)}
                    </Badge>
                    {registration.stand_type ? (
                      <Badge variant="default">{registration.stand_type}</Badge>
                    ) : null}
                    {isExternalHttpUrl(registration.event.registration_form_url) ? (
                      <a
                        className="button-link text-xs"
                        href={registration.event.registration_form_url ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Meld deg på her
                      </a>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-ink/80 md:grid-cols-2">
                  <div>
                    <p className="font-semibold text-primary">Mål</p>
                    <p>{registration.goals.join(", ") || "Ikke satt"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-primary">KPI-er</p>
                    <p>{registration.kpis.join(", ") || "Ikke satt"}</p>
                  </div>
                </div>

                <form action={updateCompanyEventGoals} className="mt-4 grid gap-3">
                  <input type="hidden" name="eventId" value={registration.event_id} />
                  <fieldset className="grid gap-2">
                    <legend className="text-sm font-semibold text-primary">Sett mål</legend>
                    <div className="grid gap-2 md:grid-cols-2">
                      {goalOptions.map((option) => (
                        <label
                          key={option}
                          className="flex items-center gap-2 rounded-xl border border-primary/10 bg-surface px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            name="goals"
                            value={option}
                            defaultChecked={registration.goals.includes(option)}
                            className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="grid gap-2">
                    <legend className="text-sm font-semibold text-primary">Velg KPI-er</legend>
                    <div className="grid gap-2 md:grid-cols-2">
                      {kpiOptions.map((option) => (
                        <label
                          key={option}
                          className="flex items-center gap-2 rounded-xl border border-primary/10 bg-surface px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            name="kpis"
                            value={option}
                            defaultChecked={registration.kpis.includes(option)}
                            className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <Button type="submit" variant="secondary">
                    Lagre mål og KPI
                  </Button>
                </form>

                <div className="mt-4 rounded-2xl border border-primary/10 bg-surface p-4">
                  <p className="text-sm font-semibold text-primary">Meld på deltaker (bedrift)</p>
                  <form action={registerCompanyAttendee} className="mt-3 grid gap-3 md:grid-cols-3">
                    <input type="hidden" name="eventId" value={registration.event_id} />
                    <label className="text-sm font-semibold text-primary md:col-span-1">
                      Navn
                      <Input name="fullName" required placeholder="Fornavn Etternavn" />
                    </label>
                    <label className="text-sm font-semibold text-primary md:col-span-1">
                      E-post
                      <Input name="email" type="email" required placeholder="navn@bedrift.no" />
                    </label>
                    <label className="text-sm font-semibold text-primary md:col-span-1">
                      Telefon
                      <Input name="phone" required placeholder="Telefonnummer" />
                    </label>
                    <Button className="md:col-span-3" type="submit">
                      Send billett
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Åpne events</h3>
        {openEvents.length === 0 ? (
          <p className="text-sm text-ink/70">Du er allerede registrert på alle aktive events.</p>
        ) : (
          <div className="grid gap-3 text-sm text-ink/80">
            <p>
              Påmelding håndteres av OSH-teamet. Ta kontakt på e-post dersom dere ønsker å delta.
            </p>
            <ul className="grid gap-2">
              {openEvents.map((event) => (
                <li key={event.id} className="rounded-xl border border-primary/10 bg-surface p-4">
                  <p className="font-semibold text-primary">{event.name}</p>
                  <p className="text-xs">{event.location ?? "Lokasjon kommer"}</p>
                  {isExternalHttpUrl(event.registration_form_url) ? (
                    <a
                      className="button-link mt-3 text-xs"
                      href={event.registration_form_url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Meld deg på her
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
