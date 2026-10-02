import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireRole } from "@/lib/auth";
import { getEventWithRegistrations, listCompanies } from "@/lib/admin";
import {
  registerCompaniesBulk,
  registerCompany,
  removeCompanyFromEventAction,
  saveEvent,
  updateRegisteredCompanyAdminChecklistAction,
} from "@/app/admin/actions";

const packageLabel: Record<string, string> = {
  standard: "Standard",
  silver: "Sølv",
  gold: "Gull",
  platinum: "Platinum",
};

type PageProps = {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

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

type RegisteredCompany = {
  id: string;
  application_id: string | null;
  application_campaign_id: string | null;
  stand_type: string | null;
  stand_code: string | null;
  package: string;
  contract_received: boolean;
  invoice_sent: boolean;
  invoice_paid: boolean;
  chair_count_registered: boolean;
  chair_count: number;
  regular_table_count_registered: boolean;
  regular_table_count: number;
  standing_table_count_registered: boolean;
  standing_table_count: number;
  checkin_tickets_registered: boolean;
  career_evening_registered: boolean;
  career_evening_company_attendee_count: number;
  career_evening_student_ticket_count: number;
  company?: { id?: string; name?: string };
};

function isPremiumPackage(packageTier: string) {
  return packageTier === "gold" || packageTier === "platinum";
}

function taskProgress(registration: RegisteredCompany) {
  const completedTasks = [
    registration.contract_received,
    registration.invoice_sent,
    registration.invoice_paid,
    registration.chair_count_registered,
    registration.regular_table_count_registered,
    registration.standing_table_count_registered,
    registration.checkin_tickets_registered,
  ];

  if (isPremiumPackage(registration.package)) {
    completedTasks.push(
      registration.career_evening_registered,
      registration.career_evening_company_attendee_count > 0,
      registration.career_evening_student_ticket_count > 0,
    );
  }

  return {
    completed: completedTasks.filter(Boolean).length,
    total: completedTasks.length,
  };
}

function checklistInputId(registrationId: string, name: string) {
  return `${registrationId}-${name}`;
}

export default async function AdminEventDetailPage({ params, searchParams }: PageProps) {
  await requireRole("admin");
  const { eventId } = await params;
  const paramsData = (await (searchParams ?? Promise.resolve({}))) as Record<string, string | string[] | undefined>;
  const saved = paramsData.saved === "1";
  const removed = paramsData.removed === "1";
  const errorMessage = typeof paramsData.error === "string" ? paramsData.error : "";
  const error = Boolean(errorMessage) && errorMessage !== "1";

  const [eventData, companies] = await Promise.all([
    getEventWithRegistrations(eventId),
    listCompanies(),
  ]);

  const registrations = eventData.registrations as unknown as RegisteredCompany[];
  const registeredCompanyIds = new Set(
    registrations.map((reg) => reg.company?.id).filter(Boolean) as string[],
  );

  const availableCompanies = companies.filter((company) => !registeredCompanyIds.has(company.id));

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Event"
        title={eventData.event.name}
        description="Oversikt over registrerte bedrifter og mulighet til å legge til flere."
        actions={
          <div className="flex items-center gap-3">
            <Link className="button-link text-xs" href={`/admin/events/${eventId}/registration`}>
              Offentlig registrering
            </Link>
            <Link className="text-sm font-semibold text-primary/70 transition hover:text-primary" href="/admin/events/overview">
              Tilbake
            </Link>
          </div>
        }
      />

      {saved ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">
          Oppdatering lagret.
        </Card>
      ) : null}
      {removed ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">
          Bedriften er fjernet fra arrangementet, og eventuell reservert stand er frigjort.
        </Card>
      ) : null}
      {error ? (
        <Card className="border border-error/30 bg-error/10 text-sm text-error">
          {errorMessage ? decodeURIComponent(errorMessage) : "Kunne ikke lagre. Sjekk feltene og prøv igjen."}
        </Card>
      ) : null}

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Rediger event</h3>
        <form action={saveEvent} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="id" value={eventData.event.id} />
          <input type="hidden" name="returnTo" value={`/admin/events/${eventId}`} />
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Navn
            <Input name="name" required defaultValue={eventData.event.name} />
          </label>
          <label className="text-sm font-semibold text-primary">
            Slug
            <Input name="slug" required defaultValue={eventData.event.slug} />
          </label>
          <label className="text-sm font-semibold text-primary">
            Lokasjon
            <Input name="location" defaultValue={eventData.event.location ?? ""} />
          </label>
          <label className="text-sm font-semibold text-primary">
            Start
            <Input name="startsAt" type="datetime-local" required defaultValue={toDateTimeLocal(eventData.event.starts_at)} />
          </label>
          <label className="text-sm font-semibold text-primary">
            Slutt
            <Input name="endsAt" type="datetime-local" required defaultValue={toDateTimeLocal(eventData.event.ends_at)} />
          </label>
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Beskrivelse
            <Textarea name="description" rows={3} defaultValue={eventData.event.description ?? ""} />
          </label>
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Påmeldingsside for bedrifter (URL)
            <Input
              name="registrationFormUrl"
              type="url"
              placeholder="https://www.oslostudenthub.no/registreringsside-student-hub-2026"
              defaultValue={eventData.event.registration_form_url ?? ""}
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-primary md:col-span-2">
            <input className="h-4 w-4" name="isActive" type="checkbox" defaultChecked={eventData.event.is_active} />
            Aktivt event
          </label>
          <Button className="md:col-span-2" type="submit">
            Lagre event
          </Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Registrer bedrift til event</h3>
        {availableCompanies.length === 0 ? (
          <p className="text-sm text-ink/70">Alle bedrifter er allerede registrert.</p>
        ) : (
          <form action={registerCompany} className="grid gap-3 md:grid-cols-3">
            <input name="eventId" type="hidden" value={eventId} readOnly />
            <input type="hidden" name="returnTo" value={`/admin/events/${eventId}`} />
            <input type="hidden" name="package" value="standard" />
            <label className="text-sm font-semibold text-primary">
              Bedrift
              <Select name="companyId" required defaultValue={availableCompanies[0]?.id}>
                {availableCompanies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Select>
            </label>
            <div className="md:col-span-3">
              <p className="text-sm font-semibold text-primary">
                Velg bedriftens kategori (oppdateres på bedriften og kan endres av bedriften selv)
              </p>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                {[
                  "BYGGINGENIØRER",
                  "DATAINGENIØR/IT",
                  "ELEKTROINGENIØRER",
                  "ENERGI & MILJØ INGENIØR",
                  "BIOTEKNOLOGI- OG KJEMIINGENIØR",
                  "MASKININGENIØRER",
                  "ØKONOMI OG ADMINISTRASJON",
                  "LEDELSE",
                  "HUMAN RESOURCES",
                ].map((category) => (
                  <label
                    key={category}
                    className="flex items-center gap-2 rounded-xl border border-primary/10 bg-surface px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="categoryTags"
                      value={category}
                      className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                    />
                    <span className="font-semibold text-primary">{category}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button variant="secondary" className="md:col-span-3" type="submit">
              Registrer til event
            </Button>
          </form>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Bulk-registrering</h3>
        <form action={registerCompaniesBulk} className="grid gap-4">
          <input name="eventId" type="hidden" value={eventId} readOnly />
          <input type="hidden" name="returnTo" value={`/admin/events/${eventId}`} />
          <input type="hidden" name="package" value="standard" />
          <div>
            <p className="text-sm font-semibold text-primary">
              Velg bedriftens kategori (oppdateres på bedriften og kan endres av bedriften selv)
            </p>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              {[
                "BYGGINGENIØRER",
                "DATAINGENIØR/IT",
                "ELEKTROINGENIØRER",
                "ENERGI & MILJØ INGENIØR",
                "BIOTEKNOLOGI- OG KJEMIINGENIØR",
                "MASKININGENIØRER",
                "ØKONOMI OG ADMINISTRASJON",
                "LEDELSE",
                "HUMAN RESOURCES",
              ].map((category) => (
                <label
                  key={category}
                  className="flex items-center gap-2 rounded-xl border border-primary/10 bg-surface px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="categoryTags"
                    value={category}
                    className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                  />
                  <span className="font-semibold text-primary">{category}</span>
                </label>
              ))}
            </div>
          </div>
          {availableCompanies.length === 0 ? (
            <p className="text-sm text-ink/70">Alle bedrifter er allerede registrert.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {availableCompanies.map((company) => (
                <label
                  key={company.id}
                  className="flex items-center gap-2 rounded-xl border border-primary/10 bg-surface px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="companyIds"
                    value={company.id}
                    className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                  />
                  <span className="font-semibold text-primary">{company.name}</span>
                </label>
              ))}
            </div>
          )}
          <Button variant="secondary" type="submit">
            Registrer valgte bedrifter
          </Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <h3 className="text-lg font-bold text-primary">Registrerte bedrifter</h3>
          <Link className="text-xs font-semibold text-primary/70 hover:text-primary" href={`/admin/company-packages?eventId=${eventId}`}>
            Administrer pakker
          </Link>
        </div>
        {eventData.registrations.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen registrerte bedrifter enda.</p>
        ) : (
          <ul className="grid gap-3 text-sm text-ink/80">
            {registrations.map((reg) => {
              const progress = taskProgress(reg);
              const isPremium = isPremiumPackage(reg.package);

              return (
                <li key={reg.id} className="rounded-2xl bg-primary/5 px-3 py-3 ring-1 ring-primary/10">
                  <details className="group">
                    <summary className="flex min-h-11 cursor-pointer list-none flex-col gap-3 rounded-xl px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-primary">{reg.company?.name ?? "Bedrift"}</p>
                        <p className="text-xs text-ink/70">Standnivå fra pakke: {reg.stand_type ?? "-"}</p>
                        <p className="text-xs text-ink/70">Standkode: {reg.stand_code ?? "Ikke satt"}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-primary ring-1 ring-primary/10">
                          Oppgaver utført {progress.completed}/{progress.total}
                        </span>
                        <span className="rounded-full bg-secondary/20 px-3 py-1 text-xs font-semibold text-primary">
                          {packageLabel[reg.package] ?? reg.package}
                        </span>
                        <span className="text-xs font-semibold text-primary/70 group-open:hidden">Åpne</span>
                        <span className="hidden text-xs font-semibold text-primary/70 group-open:inline">Lukk</span>
                      </div>
                    </summary>

                    <div className="mt-4 grid gap-4 border-t border-primary/10 pt-4">
                      <form action={updateRegisteredCompanyAdminChecklistAction} className="grid gap-4">
                        <input type="hidden" name="registrationId" value={reg.id} />
                        <input type="hidden" name="returnTo" value={`/admin/events/${eventId}`} />

                        <fieldset className="grid gap-2">
                          <legend className="text-sm font-bold text-primary">Oppfølging</legend>
                          <div className="grid gap-2 md:grid-cols-2">
                            {[
                              ["contractReceived", "Mottatt kontrakt", reg.contract_received],
                              ["invoiceSent", "Sendt faktura", reg.invoice_sent],
                              ["invoicePaid", "Faktura betalt", reg.invoice_paid],
                              ["checkinTicketsRegistered", "Registrert billetter på Checkin", reg.checkin_tickets_registered],
                            ].map(([name, label, checked]) => (
                              <label key={String(name)} className="flex min-h-11 items-center gap-2 rounded-xl border border-primary/10 bg-surface px-3 py-2 text-sm font-semibold text-primary">
                                <input
                                  type="checkbox"
                                  name={String(name)}
                                  defaultChecked={Boolean(checked)}
                                  className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-secondary"
                                />
                                {label}
                              </label>
                            ))}
                          </div>
                        </fieldset>

                        <fieldset className="grid gap-2">
                          <legend className="text-sm font-bold text-primary">Møbler og standutstyr</legend>
                          <div className="grid gap-3 lg:grid-cols-3">
                            {[
                              ["chairCountRegistered", "chairCount", "Registrert antall stoler", reg.chair_count_registered, reg.chair_count],
                              ["regularTableCountRegistered", "regularTableCount", "Registrert antall vanlige bord", reg.regular_table_count_registered, reg.regular_table_count],
                              ["standingTableCountRegistered", "standingTableCount", "Registrert antall ståbord", reg.standing_table_count_registered, reg.standing_table_count],
                            ].map(([checkboxName, countName, label, checked, count]) => {
                              const inputId = checklistInputId(reg.id, String(countName));
                              return (
                                <div key={String(countName)} className="rounded-xl border border-primary/10 bg-surface p-3">
                                  <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-primary">
                                    <input
                                      type="checkbox"
                                      name={String(checkboxName)}
                                      defaultChecked={Boolean(checked)}
                                      className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-secondary"
                                    />
                                    {label}
                                  </label>
                                  <label className="mt-2 block text-xs font-semibold text-primary/70" htmlFor={inputId}>
                                    Antall
                                  </label>
                                  <Input
                                    id={inputId}
                                    name={String(countName)}
                                    type="number"
                                    min="0"
                                    inputMode="numeric"
                                    defaultValue={Number(count) || 0}
                                    className="mt-1 rounded-xl"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </fieldset>

                        {isPremium ? (
                          <fieldset className="grid gap-2 rounded-xl border border-secondary/30 bg-secondary/10 p-3">
                            <legend className="px-1 text-sm font-bold text-primary">Karrierekveld for gull og platinum</legend>
                            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-primary/10 bg-surface px-3 py-2 text-sm font-semibold text-primary">
                              <input
                                type="checkbox"
                                name="careerEveningRegistered"
                                defaultChecked={reg.career_evening_registered}
                                className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-secondary"
                              />
                              Registrert seg for karrierekvelden
                            </label>
                            <div className="grid gap-3 md:grid-cols-2">
                              <label className="text-sm font-semibold text-primary" htmlFor={checklistInputId(reg.id, "careerEveningCompanyAttendeeCount")}>
                                Antall fra bedrift som skal delta
                                <Input
                                  id={checklistInputId(reg.id, "careerEveningCompanyAttendeeCount")}
                                  name="careerEveningCompanyAttendeeCount"
                                  type="number"
                                  min="0"
                                  inputMode="numeric"
                                  defaultValue={reg.career_evening_company_attendee_count || 0}
                                  className="mt-1 rounded-xl"
                                />
                              </label>
                              <label className="text-sm font-semibold text-primary" htmlFor={checklistInputId(reg.id, "careerEveningStudentTicketCount")}>
                                Antall studentbilletter de ønsker å gi ut
                                <Input
                                  id={checklistInputId(reg.id, "careerEveningStudentTicketCount")}
                                  name="careerEveningStudentTicketCount"
                                  type="number"
                                  min="0"
                                  inputMode="numeric"
                                  defaultValue={reg.career_evening_student_ticket_count || 0}
                                  className="mt-1 rounded-xl"
                                />
                              </label>
                            </div>
                          </fieldset>
                        ) : (
                          <input type="hidden" name="careerEveningCompanyAttendeeCount" value="0" />
                        )}
                        {!isPremium ? <input type="hidden" name="careerEveningStudentTicketCount" value="0" /> : null}

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <Button type="submit" variant="secondary" className="w-full sm:w-auto">
                            Lagre oppfølging
                          </Button>
                          <div className="flex flex-wrap gap-2 sm:justify-end">
                            {reg.application_id && reg.application_campaign_id ? (
                              <Link
                                className="button-link text-xs"
                                href={`/admin/events/${eventId}/registration/${reg.application_campaign_id}/applications/${reg.application_id}`}
                              >
                                Oppdater standplass
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </form>

                      <div className="flex justify-end">
                        <form action={removeCompanyFromEventAction}>
                          <input type="hidden" name="registrationId" value={reg.id} />
                          <input type="hidden" name="returnTo" value={`/admin/events/${eventId}`} />
                          <Button type="submit" variant="danger" className="min-h-9 px-4 py-2 text-xs">
                            Fjern fra event
                          </Button>
                        </form>
                      </div>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
