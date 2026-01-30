import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { addCompanyDomainAction, approveCompanyAccessAction, createCompanyAction, inviteCompany, registerCompany, setPackage } from "@/app/admin/actions";
import { listCompanies, listCompanyAccessRequests, listCompanyDomains } from "@/lib/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CompaniesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function packageLabel(pkg?: string | null) {
  if (!pkg) return "ikke registrert";
  if (pkg === "standard") return "Standard";
  if (pkg === "silver") return "Sølv";
  if (pkg === "gold") return "Gull";
  if (pkg === "platinum") return "Platinum";
  return pkg;
}

export default async function AdminCompaniesPage({ searchParams }: CompaniesPageProps) {
  const params = await searchParams;
  const saved = params.saved === "1";
  const errorMessage = typeof params.error === "string" ? params.error : "";
  const error = Boolean(errorMessage) && errorMessage !== "1";
  const supabase = await createServerSupabaseClient();

  const [
    { data: events, error: eventsError },
    companies,
    { data: eventCompanies, error: eventCompaniesError },
    companyDomains,
    accessRequests,
  ] =
    await Promise.all([
      supabase.from("events").select("*").order("starts_at", { ascending: false }),
      listCompanies(),
      supabase.from("event_companies").select("*").order("created_at", { ascending: false }),
      listCompanyDomains(),
      listCompanyAccessRequests(),
    ]);

  if (eventsError) throw eventsError;
  if (eventCompaniesError) throw eventCompaniesError;
  if (!events || events.length === 0) {
    return (
      <Card>
        <SectionHeader title="Bedrifter" description="Opprett et event først." />
        <Link
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-surface"
          href="/admin/events"
        >
          Gå til events
        </Link>
      </Card>
    );
  }

  const query = typeof params.q === "string" ? params.q.toLowerCase() : "";
  const sort = typeof params.sort === "string" ? params.sort : "name";
  const dir = params.dir === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(params.page ?? "1"));
  const pageSize = 20;

  const filteredCompanies = companies.filter((company) =>
    query.length === 0 ? true : company.name.toLowerCase().includes(query),
  );

  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    const aValue = sort === "industry" ? a.industry ?? "" : a.name;
    const bValue = sort === "industry" ? b.industry ?? "" : b.name;
    return dir === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
  });
  const totalPages = Math.max(1, Math.ceil(sortedCompanies.length / pageSize));
  const pagedCompanies = sortedCompanies.slice((page - 1) * pageSize, page * pageSize);

  const eventCompanyMap = new Map(
    (eventCompanies ?? []).map((row) => [`${row.company_id}:${row.event_id}`, row]),
  );

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Bedrifter"
        title="Invitasjoner og pakker"
        description="Sett pakker per bedrift per event. Connect Hub 2026-pakker styrer ROI-tilgang."
        actions={<Link className="text-sm font-semibold text-primary/70 hover:text-primary" href="/admin/events">Administrer events</Link>}
      />

      {saved ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">
          Oppdatering lagret.
        </Card>
      ) : null}
      {error ? (
        <Card className="border border-error/30 bg-error/10 text-sm text-error">
          {errorMessage ? decodeURIComponent(errorMessage) : "Kunne ikke lagre. Sjekk feltene og prøv igjen."}
        </Card>
      ) : null}

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Opprett bedrift</h3>
        <form action={createCompanyAction} className="grid gap-3 md:grid-cols-4">
          <input type="hidden" name="returnTo" value="/admin/companies" />
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Bedriftsnavn
            <Input name="name" required placeholder="F.eks. Equinor" />
          </label>
          <label className="text-sm font-semibold text-primary">
            Org.nr
            <Input name="orgNumber" required placeholder="9 siffer" />
          </label>
          <label className="text-sm font-semibold text-primary">
            Bransje
            <Input name="industry" placeholder="Teknologi" />
          </label>
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Lokasjon
            <Input name="location" placeholder="Oslo" />
          </label>
          <Button className="md:col-span-4" type="submit">
            Opprett bedrift
          </Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Domener for bedrifts-tilgang</h3>
        {companies.length === 0 ? (
          <p className="text-sm text-ink/70">Opprett en bedrift før du legger til domene.</p>
        ) : (
          <form action={addCompanyDomainAction} className="grid gap-3 md:grid-cols-3">
            <input type="hidden" name="returnTo" value="/admin/companies" />
            <label className="text-sm font-semibold text-primary">
              Bedrift
              <Select name="companyId" required defaultValue={companies[0]?.id}>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm font-semibold text-primary md:col-span-2">
              Domene
              <Input name="domain" required placeholder="equinor.com" />
            </label>
            <Button className="md:col-span-3" variant="secondary" type="submit">
              Legg til domene
            </Button>
          </form>
        )}
        {companyDomains.length === 0 ? (
          <p className="text-xs text-ink/60">Ingen domener registrert ennå.</p>
        ) : (
          <div className="flex flex-wrap gap-2 text-xs text-ink/70">
            {companyDomains.map((domain) => (
              <span key={domain.id} className="rounded-full bg-primary/5 px-3 py-1">
                {domain.domain} · {domain.company?.name ?? "Bedrift"}
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Tilgangsforespørsler</h3>
        {accessRequests.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen forespørsler akkurat nå.</p>
        ) : (
          <div className="grid gap-3">
            {accessRequests.map((request) => (
              <div key={request.id} className="rounded-xl border border-primary/10 bg-primary/5 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-primary">{request.email}</p>
                    <p className="text-xs text-ink/70">
                      {request.domain} · {request.company?.name ?? "Ukjent bedrift"}
                    </p>
                  </div>
                  <form action={approveCompanyAccessAction} className="flex items-center gap-2">
                    <input type="hidden" name="returnTo" value="/admin/companies" />
                    <input type="hidden" name="requestId" value={request.id} />
                    <input type="hidden" name="companyId" value={request.company_id ?? ""} />
                    <input type="hidden" name="userId" value={request.user_id} />
                    <Button type="submit">Godkjenn</Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Inviter bedrift (e-post)</h3>
        {filteredCompanies.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen bedrifter å invitere. Fjern filter eller opprett en bedrift.</p>
        ) : (
          <form action={inviteCompany} className="grid gap-3 md:grid-cols-3">
            <input type="hidden" name="returnTo" value="/admin/companies" />
            <label className="text-sm font-semibold text-primary">
              Event
              <Select name="eventId" required defaultValue={events[0]?.id}>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm font-semibold text-primary">
              Bedrift
              <Select name="companyId" required defaultValue={filteredCompanies[0]?.id}>
                {filteredCompanies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm font-semibold text-primary md:col-span-2">
              Kontakt e-post
              <Input name="email" required placeholder="kontakt@bedrift.no" />
            </label>
            <Button className="md:col-span-3" type="submit">
              Send invitasjon
            </Button>
          </form>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Registrer bedrift til event</h3>
        {filteredCompanies.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen bedrifter å registrere. Fjern filter eller opprett en bedrift.</p>
        ) : (
          <form action={registerCompany} className="grid gap-3 md:grid-cols-4">
            <input type="hidden" name="returnTo" value="/admin/companies" />
            <label className="text-sm font-semibold text-primary">
              Event
              <Select name="eventId" required defaultValue={events[0]?.id}>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm font-semibold text-primary">
              Bedrift
              <Select name="companyId" required defaultValue={filteredCompanies[0]?.id}>
                {filteredCompanies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm font-semibold text-primary">
              Pakke
              <Select name="package" defaultValue="standard">
                <option value="standard">Standard</option>
                <option value="silver">Sølv</option>
                <option value="gold">Gull</option>
                <option value="platinum">Platinum</option>
              </Select>
            </label>
            <label className="text-sm font-semibold text-primary">
              Standtype (valgfritt)
              <Input name="standType" placeholder="Standard, Premium" />
            </label>
            <Button className="md:col-span-4" variant="secondary" type="submit">
              Registrer til event
            </Button>
          </form>
        )}
      </Card>

      <section className="grid gap-4">
        <Card className="flex flex-col gap-3">
          <h3 className="text-lg font-bold text-primary">Søk i bedrifter</h3>
          <form className="grid gap-3 md:grid-cols-4" method="get">
            <label className="text-sm font-semibold text-primary md:col-span-2">
              Søk
              <Input name="q" defaultValue={query} placeholder="Søk på bedriftsnavn" />
            </label>
            <label className="text-sm font-semibold text-primary">
              Sortering
              <Select name="sort" defaultValue={sort}>
                <option value="name">Navn</option>
                <option value="industry">Bransje</option>
              </Select>
            </label>
            <label className="text-sm font-semibold text-primary">
              Rekkefølge
              <Select name="dir" defaultValue={dir}>
                <option value="asc">A–Å</option>
                <option value="desc">Å–A</option>
              </Select>
            </label>
            <Button variant="secondary" type="submit" className="md:col-span-4">
              Filtrer
            </Button>
          </form>
        </Card>

        <Card className="overflow-x-auto">
          <table className="min-w-full divide-y divide-primary/10 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-primary/60">
                <th className="px-4 py-3">Bedrift</th>
                <th className="px-4 py-3">Org.nr</th>
                <th className="px-4 py-3">Bransje</th>
                <th className="px-4 py-3">Lokasjon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {pagedCompanies.map((company) => (
                <tr key={`row-${company.id}`}>
                  <td className="px-4 py-3 font-semibold text-primary">
                    <Link href={`/admin/companies/${company.id}`} className="hover:underline">
                      {company.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink/80">{company.org_number ?? "—"}</td>
                  <td className="px-4 py-3 text-ink/80">{company.industry ?? "—"}</td>
                  <td className="px-4 py-3 text-ink/80">{company.location ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {pagedCompanies.map((company) => {
          const companyRegistrations = (eventCompanies ?? []).filter((row) => row.company_id === company.id);
          const defaultEventId = companyRegistrations[0]?.event_id ?? events[0]?.id;
          const registration = defaultEventId
            ? eventCompanyMap.get(`${company.id}:${defaultEventId}`)
            : undefined;
          const defaultAccessFrom = registration?.access_from ?? new Date().toISOString();
          return (
            <Card key={company.id} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <Link href={`/admin/companies/${company.id}`} className="text-lg font-bold text-primary hover:underline">
                    {company.name}
                  </Link>
                  <p className="text-xs text-ink/70">
                    {company.industry ?? "Bransje ikke satt"} · Org.nr: {company.org_number ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={registration?.package === "platinum" ? "success" : "default"}>
                    {packageLabel(registration?.package)}
                  </Badge>
                </div>
              </div>
              <form action={setPackage} className="grid gap-3 md:grid-cols-5">
                <input type="hidden" name="returnTo" value="/admin/companies" />
                <input name="companyId" type="hidden" value={company.id} readOnly />
                <label className="text-sm font-semibold text-primary">
                  Event
                  <Select name="eventId" defaultValue={defaultEventId}>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.name}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="text-sm font-semibold text-primary">
                  Pakke
                  <Select name="package" defaultValue={registration?.package ?? "standard"}>
                    <option value="standard">Standard</option>
                    <option value="silver">Sølv</option>
                    <option value="gold">Gull</option>
                    <option value="platinum">Platinum</option>
                  </Select>
                </label>
                <label className="text-sm font-semibold text-primary">
                  Tilgang fra
                  <Input name="accessFrom" type="datetime-local" defaultValue={toLocalInput(defaultAccessFrom)} />
                </label>
                <label className="text-sm font-semibold text-primary">
                  Tilgang til
                  <Input name="accessUntil" type="datetime-local" defaultValue={toLocalInput(registration?.access_until ?? null)} />
                </label>
                <Button variant="secondary" className="md:self-end" type="submit">
                  Lagre
                </Button>
              </form>
              {companyRegistrations.length > 0 ? (
                <div className="flex flex-wrap gap-2 text-xs text-ink/70">
                  {companyRegistrations.map((reg) => {
                    const eventName = events.find((event) => event.id === reg.event_id)?.name ?? "Event";
                    const from = reg.access_from ? new Date(reg.access_from).toLocaleDateString("nb-NO") : "—";
                    const until = reg.access_until ? new Date(reg.access_until).toLocaleDateString("nb-NO") : "—";
                    return (
                      <span key={reg.id} className="rounded-full bg-primary/5 px-3 py-1">
                        {eventName} – {packageLabel(reg.package)} – {from}–{until}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-ink/70">Ingen event-tilknytninger ennå.</p>
              )}
              {registration?.invited_email ? (
                <p className="text-xs text-ink/70">Invitert: {registration.invited_email}</p>
              ) : null}
            </Card>
          );
        })}
      </section>

      <div className="flex items-center justify-between text-sm text-ink/70">
        <span>Side {page} av {totalPages}</span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              className="rounded-full border border-primary/20 px-3 py-1"
              href={`?q=${encodeURIComponent(query)}&sort=${sort}&dir=${dir}&page=${page - 1}`}
            >
              Forrige
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              className="rounded-full border border-primary/20 px-3 py-1"
              href={`?q=${encodeURIComponent(query)}&sort=${sort}&dir=${dir}&page=${page + 1}`}
            >
              Neste
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
