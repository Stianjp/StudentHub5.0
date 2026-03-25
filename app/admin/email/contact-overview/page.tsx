import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { requireRole } from "@/lib/auth";
import {
  caseStatusLabel,
  caseStatusVariant,
  formatContactOverviewTimestamp,
  getContactOverviewMailboxSummary,
  listContactOverviewCompanies,
  type ContactOverviewListItem,
} from "@/lib/email-contact-overview";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createContactCompanyAction, syncContactOverviewAction } from "./actions";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function ContactOverviewPage({ searchParams }: PageProps) {
  await requireRole("admin");
  const params = await searchParams;
  const query = firstValue(params.q);
  const includeArchived = firstValue(params.archived) === "1";
  const saved = firstValue(params.saved) === "1";
  const sent = firstValue(params.sent) === "1";
  const error = firstValue(params.error);
  const synced = firstValue(params.synced);
  const created = firstValue(params.created);

  const supabase = createAdminSupabaseClient();
  const [items, mailboxSummary, { data: events }] = await Promise.all([
    listContactOverviewCompanies({ query, includeArchived }),
    getContactOverviewMailboxSummary(),
    supabase.from("events").select("id, name").order("starts_at", { ascending: false }),
  ]);
  const typedItems = items as ContactOverviewListItem[];
  const typedEvents = (events ?? []) as Array<{ id: string; name: string }>;

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="E-post"
        title="Kontaktoversikt"
        description="Følg opp bedrifter, samle Gmail-dialog i saker og hold oversikt over hva som mangler før event."
        actions={
          <>
            <Link
              href="/admin/email"
              className="inline-flex items-center justify-center rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary transition hover:border-secondary hover:bg-secondary/10 hover:text-secondary"
            >
              Til Send e-post
            </Link>
            <form action={syncContactOverviewAction}>
              <input type="hidden" name="returnTo" value="/admin/email/contact-overview" />
              <Button type="submit" variant="secondary" className="rounded-xl px-4 py-2 text-xs">
                Sync nå
              </Button>
            </form>
          </>
        }
      />

      {saved ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">
          Endringen er lagret.
        </Card>
      ) : null}
      {sent ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">
          E-post er sendt fra Gmail-kontoen og logget på saken.
        </Card>
      ) : null}
      {synced ? (
        <Card className="border border-info/30 bg-info/10 text-sm text-ink/90">
          Sync fullført. Nye meldinger: <strong>{synced}</strong>. Nye bedrifter / saker:{" "}
          <strong>{created || "0/0"}</strong>.
        </Card>
      ) : null}
      {error ? (
        <Card className="border border-error/30 bg-error/10 text-sm text-error">
          {decodeURIComponent(error)}
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Mailbox</p>
          <p className="text-lg font-bold text-primary">{mailboxSummary.delegatedUser ?? "Ikke satt"}</p>
          <p className="text-sm text-ink/70">
            Status: {mailboxSummary.configured ? "Klar for sync og sending" : "Mangler Gmail-oppsett"}
          </p>
        </Card>
        <Card className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Siste synk</p>
          <p className="text-lg font-bold text-primary">
            {formatContactOverviewTimestamp(mailboxSummary.lastSyncedAt)}
          </p>
          <p className="text-sm text-ink/70">
            {mailboxSummary.lastError ? `Siste feil: ${mailboxSummary.lastError}` : "Ingen synk-feil logget."}
          </p>
        </Card>
        <Card className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Kontaktbedrifter</p>
          <p className="text-lg font-bold text-primary">{typedItems.length}</p>
          <p className="text-sm text-ink/70">Company-first oversikt med flere saker per bedrift.</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_24rem]">
        <Card className="flex flex-col gap-5 overflow-hidden">
          <form method="get" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_10rem] md:items-end">
            <label className="text-sm font-semibold text-primary">
              Søk bedrift eller domene
              <Input name="q" defaultValue={query} placeholder="f.eks. studenthub.no eller Equinor" />
            </label>
            <label className="text-sm font-semibold text-primary">
              Visning
              <Select name="archived" defaultValue={includeArchived ? "1" : "0"}>
                <option value="0">Aktive</option>
                <option value="1">Også arkiverte</option>
              </Select>
            </label>
            <Button type="submit" variant="secondary" className="rounded-xl">
              Filtrer
            </Button>
          </form>

          {typedItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-8 text-sm text-ink/70">
              Ingen kontaktbedrifter funnet. Kjør sync eller opprett en manuelt i panelet til høyre.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-primary/10 text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-primary/60">
                    <th className="px-4 py-3">Bedrift</th>
                    <th className="px-4 py-3">Aktiv sak</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Siste aktivitet</th>
                    <th className="px-4 py-3">Åpne saker</th>
                    <th className="px-4 py-3">Checklist</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  {typedItems.map((item: ContactOverviewListItem) => (
                    <tr key={item.company.id} className="align-top">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/email/contact-overview/${item.company.id}${item.activeCase ? `?case=${item.activeCase.id}` : ""}`}
                          className="block hover:underline"
                        >
                          <span className="font-semibold text-primary">{item.company.display_name}</span>
                          <span className="mt-1 block text-xs text-ink/60">
                            {item.company.primary_domain}
                            {item.company.primary_email ? ` · ${item.company.primary_email}` : ""}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-ink/80">
                        {item.activeCase ? (
                          <>
                            <p className="font-medium text-primary">{item.activeCase.title}</p>
                            <p className="mt-1 text-xs text-ink/60">{item.activeCase.case_number}</p>
                          </>
                        ) : (
                          "Ingen saker"
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink/80">{item.eventName ?? "Uten event"}</td>
                      <td className="px-4 py-3 text-ink/80">{formatContactOverviewTimestamp(item.latestMessageAt)}</td>
                      <td className="px-4 py-3 text-ink/80">{item.openCaseCount}</td>
                      <td className="px-4 py-3 text-ink/80">
                        {item.checklistTotal > 0
                          ? `${item.checklistCompleted}/${item.checklistTotal}`
                          : "Ingen punkter"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={item.activeCase ? caseStatusVariant(item.activeCase.status) : "default"}>
                          {item.activeCase ? caseStatusLabel(item.activeCase.status) : "Ingen sak"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Ny kontaktbedrift</p>
              <h3 className="text-lg font-bold text-primary">Opprett manuelt</h3>
              <p className="text-sm text-ink/70">
                Oppretter både kontaktprofil og en første sak i samme flyt.
              </p>
            </div>
            <form action={createContactCompanyAction} className="flex flex-col gap-3">
              <label className="text-sm font-semibold text-primary">
                Bedriftsnavn
                <Input name="displayName" required placeholder="F.eks. Equinor" />
              </label>
              <label className="text-sm font-semibold text-primary">
                Primært domene
                <Input name="primaryDomain" required placeholder="equinor.com" />
              </label>
              <label className="text-sm font-semibold text-primary">
                Kontakt-e-post
                <Input name="primaryEmail" placeholder="kontakt@bedrift.no" />
              </label>
              <label className="text-sm font-semibold text-primary">
                Knytt første sak til event
                <Select name="eventId" defaultValue="">
                  <option value="">Uten event</option>
                  {typedEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </Select>
              </label>
              <Button type="submit">Opprett kontaktbedrift</Button>
            </form>
          </Card>

          <Card className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Gmail-status</p>
            <div className="grid gap-2 text-sm text-ink/80">
              <p>
                <span className="font-semibold text-primary">Delegert bruker:</span>{" "}
                {mailboxSummary.delegatedUser ?? "Ikke satt"}
              </p>
              <p>
                <span className="font-semibold text-primary">Manglende env:</span>{" "}
                {mailboxSummary.missingConfig.join(", ") || "Ingen"}
              </p>
              <p>
                <span className="font-semibold text-primary">Siste feil:</span>{" "}
                {mailboxSummary.lastError ?? "Ingen"}
              </p>
            </div>
            <Link href="/admin/crm/gmail-feasibility" className="text-sm font-semibold text-primary underline">
              Åpne Gmail-feasibility
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
