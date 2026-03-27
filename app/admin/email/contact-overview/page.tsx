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
  countContactOverviewCompaniesForOwner,
  formatContactOverviewTimestamp,
  getContactOverviewMailboxSummary,
  listContactOverviewCompanies,
  type ContactOverviewListItem,
  type ContactOverviewOwnerFilter,
} from "@/lib/email-contact-overview";
import { syncContactOverviewAction } from "./actions";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function ContactOverviewPage({ searchParams }: PageProps) {
  const profile = await requireRole("admin");
  const params = await searchParams;
  const query = firstValue(params.q);
  const ownerScope = (firstValue(params.ownerScope) || "all") as ContactOverviewOwnerFilter;
  const includeArchived = firstValue(params.archived) === "1";
  const saved = firstValue(params.saved) === "1";
  const sent = firstValue(params.sent) === "1";
  const error = firstValue(params.error);
  const synced = firstValue(params.synced);
  const created = firstValue(params.created);

  const [items, mailboxSummary, myCompanyCount] = await Promise.all([
    listContactOverviewCompanies({
      query,
      includeArchived,
      ownerScope,
      currentProfileId: profile.id,
    }),
    getContactOverviewMailboxSummary(),
    countContactOverviewCompaniesForOwner(profile.id),
  ]);

  const typedItems = items as ContactOverviewListItem[];
  const unassignedCount = typedItems.filter((item) => !item.owner).length;
  const unreadCompanyCount = typedItems.filter((item) => item.unreadCount > 0).length;

  return (
    <div className="rounded-[36px] border border-white/40 bg-[#FFF4E0] p-6 text-[#2D1C63] shadow-[0_30px_80px_rgba(20,2,73,0.18)] md:p-8">
      <div className="flex flex-col gap-8">
        <SectionHeader
          eyebrow="E-post"
          title="Kontaktoversikt"
          description="Fordel kontaktbedrifter på eier, se uleste meldinger og følg opp bedriftene i én bred oversikt."
          actions={
            <>
              <Link
                href="/admin/email/contact-overview/new"
                className="inline-flex items-center justify-center rounded-xl border border-[#D46839]/30 bg-[#D46839] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#bc572b]"
              >
                Opprett ny bedriftsprofil
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

        <div className="grid gap-4 xl:grid-cols-4">
          <Card className="flex flex-col gap-2 border border-[#D46839]/15 bg-white/80">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6E4DB0]">Antall kontaktbedrifter på meg</p>
            <p className="text-3xl font-bold text-[#2D1C63]">{myCompanyCount}</p>
            <p className="text-sm text-[#2D1C63]/70">{profile.full_name ?? "Din bruker"} er satt som ansvarlig.</p>
          </Card>
          <Card className="flex flex-col gap-2 border border-[#D46839]/15 bg-white/80">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6E4DB0]">Totale kontaktbedrifter</p>
            <p className="text-3xl font-bold text-[#2D1C63]">{typedItems.length}</p>
            <p className="text-sm text-[#2D1C63]/70">Filtrert etter valgt visning.</p>
          </Card>
          <Card className="flex flex-col gap-2 border border-[#D46839]/15 bg-white/80">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6E4DB0]">Uleste bedrifter</p>
            <p className="text-3xl font-bold text-[#D46839]">{unreadCompanyCount}</p>
            <p className="text-sm text-[#2D1C63]/70">Har minst én ulest innkommende melding.</p>
          </Card>
          <Card className="flex flex-col gap-2 border border-[#D46839]/15 bg-white/80">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6E4DB0]">Bedrifter uten eier</p>
            <p className="text-3xl font-bold text-[#2D1C63]">{unassignedCount}</p>
            <p className="text-sm text-[#2D1C63]/70">
              Mailbox: {mailboxSummary.delegatedUser ?? "Ikke satt"}
            </p>
          </Card>
        </div>

        <Card className="flex flex-col gap-6 border border-[#D46839]/15 bg-white/85">
          <form
            method="get"
            className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_16rem_12rem_10rem] lg:items-end"
          >
            <label className="text-sm font-semibold text-[#2D1C63]">
              Søk bedrift eller domene
              <Input
                name="q"
                defaultValue={query}
                placeholder="f.eks. studenthub.no eller Equinor"
                className="border-[#6E4DB0]/20 bg-white"
              />
            </label>
            <label className="text-sm font-semibold text-[#2D1C63]">
              Ansvarsfilter
              <Select name="ownerScope" defaultValue={ownerScope} className="border-[#6E4DB0]/25 bg-white">
                <option value="all">Alle bedrifter</option>
                <option value="mine">Mine bedrifter</option>
                <option value="team">Teamets bedrifter</option>
                <option value="unassigned">Bedrifter uten eier</option>
              </Select>
            </label>
            <label className="text-sm font-semibold text-[#2D1C63]">
              Visning
              <Select name="archived" defaultValue={includeArchived ? "1" : "0"} className="border-[#6E4DB0]/25 bg-white">
                <option value="0">Aktive</option>
                <option value="1">Også arkiverte</option>
              </Select>
            </label>
            <Button type="submit" variant="secondary" className="rounded-xl">
              Filtrer
            </Button>
          </form>

          {typedItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#6E4DB0]/25 bg-[#F7EFE2] p-8 text-sm text-[#2D1C63]/70">
              Ingen kontaktbedrifter funnet for dette filteret.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#6E4DB0]/10 text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-[#6E4DB0]">
                    <th className="px-4 py-3">Varsel</th>
                    <th className="px-4 py-3">Bedrift</th>
                    <th className="px-4 py-3">Sakseier</th>
                    <th className="px-4 py-3">Aktiv sak</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Siste aktivitet</th>
                    <th className="px-4 py-3">Åpne saker</th>
                    <th className="px-4 py-3">Checklist</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#6E4DB0]/8">
                  {typedItems.map((item) => (
                    <tr
                      key={item.company.id}
                      className={`align-top ${item.unreadCount > 0 ? "bg-[#FFF0D7]" : "bg-transparent"}`}
                    >
                      <td className="px-4 py-4">
                        {item.unreadCount > 0 ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-[#D46839]/15 px-3 py-1 text-xs font-semibold text-[#D46839]">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#D46839]" />
                            {item.unreadCount} ny
                          </span>
                        ) : (
                          <span className="text-xs text-[#2D1C63]/45">Ingen</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/email/contact-overview/${item.company.id}${item.activeCase ? `?case=${item.activeCase.id}` : ""}`}
                          className="block hover:underline"
                        >
                          <span className="font-semibold text-[#2D1C63]">{item.company.display_name}</span>
                          <span className="mt-1 block text-xs text-[#2D1C63]/60">
                            {item.company.primary_domain}
                            {item.company.primary_email ? ` · ${item.company.primary_email}` : ""}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-[#2D1C63]/80">
                        {item.owner ? item.owner.full_name ?? "Admin" : "Utdelt"}
                      </td>
                      <td className="px-4 py-4 text-[#2D1C63]/80">
                        {item.activeCase ? (
                          <>
                            <p className="font-medium text-[#2D1C63]">{item.activeCase.title}</p>
                            <p className="mt-1 text-xs text-[#2D1C63]/55">{item.activeCase.case_number}</p>
                          </>
                        ) : (
                          "Ingen saker"
                        )}
                      </td>
                      <td className="px-4 py-4 text-[#2D1C63]/80">{item.eventName ?? "Uten event"}</td>
                      <td className="px-4 py-4 text-[#2D1C63]/80">{formatContactOverviewTimestamp(item.latestMessageAt)}</td>
                      <td className="px-4 py-4 text-[#2D1C63]/80">{item.openCaseCount}</td>
                      <td className="px-4 py-4 text-[#2D1C63]/80">
                        {item.checklistTotal > 0 ? `${item.checklistCompleted}/${item.checklistTotal}` : "Ingen punkter"}
                      </td>
                      <td className="px-4 py-4">
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
      </div>
    </div>
  );
}
