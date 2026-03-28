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
  type ContactOverviewOwnerFilter,
  type ContactOverviewStatusFilter,
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
  const legacyArchived = firstValue(params.archived) === "1";
  const statusFilter = ((firstValue(params.status) || (legacyArchived ? "all" : "active")) ||
    "active") as ContactOverviewStatusFilter;
  const saved = firstValue(params.saved) === "1";
  const sent = firstValue(params.sent) === "1";
  const error = firstValue(params.error);
  const synced = firstValue(params.synced);
  const created = firstValue(params.created);

  const [items, mailboxSummary, myItems] = await Promise.all([
    listContactOverviewCompanies({
      query,
      ownerScope,
      statusFilter,
      currentProfileId: profile.id,
    }),
    getContactOverviewMailboxSummary(),
    listContactOverviewCompanies({
      ownerScope: "mine",
      statusFilter,
      currentProfileId: profile.id,
    }),
  ]);

  const typedItems = items as ContactOverviewListItem[];
  const myCompanyCount = (myItems as ContactOverviewListItem[]).length;
  const unassignedCount = typedItems.filter((item) => !item.owner).length;
  const unreadCompanyCount = typedItems.filter((item) => item.unreadCount > 0).length;

  return (
    <div className="contact-overview-page flex flex-col gap-8">
        <SectionHeader
          eyebrow="E-post"
          title="Kontaktoversikt"
          description="Fordel kontaktbedrifter på eier, se uleste meldinger og følg opp bedriftene i én bred oversikt."
          tone="light"
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
          <Card className="flex flex-col gap-2 border border-[#D46839]/15 bg-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#4B367A]">Antall kontaktbedrifter på meg</p>
            <p className="text-3xl font-bold text-[#140249]">{myCompanyCount}</p>
            <p className="text-sm text-[#4A3D6A]">{profile.full_name ?? "Din bruker"} er satt som ansvarlig.</p>
          </Card>
          <Card className="flex flex-col gap-2 border border-[#D46839]/15 bg-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#4B367A]">Totale kontaktbedrifter</p>
            <p className="text-3xl font-bold text-[#140249]">{typedItems.length}</p>
            <p className="text-sm text-[#4A3D6A]">Filtrert etter valgt visning.</p>
          </Card>
          <Card className="flex flex-col gap-2 border border-[#D46839]/15 bg-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#4B367A]">Uleste bedrifter</p>
            <p className="text-3xl font-bold text-[#D46839]">{unreadCompanyCount}</p>
            <p className="text-sm text-[#4A3D6A]">Har minst én ulest innkommende melding.</p>
          </Card>
          <Card className="flex flex-col gap-2 border border-[#D46839]/15 bg-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#4B367A]">Bedrifter uten eier</p>
            <p className="text-3xl font-bold text-[#140249]">{unassignedCount}</p>
            <p className="text-sm text-[#4A3D6A]">
              Mailbox: {mailboxSummary.delegatedUser ?? "Ikke satt"}
            </p>
          </Card>
        </div>

        <Card className="flex flex-col gap-6 border border-[#D46839]/15 bg-white">
          <form
            method="get"
            className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_16rem_14rem_10rem] lg:items-end"
          >
            <label className="text-sm font-semibold text-[#140249]">
              Søk bedrift eller domene
              <Input
                name="q"
                defaultValue={query}
                placeholder="f.eks. studenthub.no eller Equinor"
                className="border-[#5A458B]/30 bg-white text-[#1A1626] placeholder:text-[#5D527B]"
              />
            </label>
            <label className="text-sm font-semibold text-[#140249]">
              Ansvarsfilter
              <Select name="ownerScope" defaultValue={ownerScope} className="border-[#5A458B]/30 bg-white text-[#1A1626]">
                <option value="all">Alle bedrifter</option>
                <option value="mine">Mine bedrifter</option>
                <option value="team">Teamets bedrifter</option>
                <option value="unassigned">Bedrifter uten eier</option>
              </Select>
            </label>
            <label className="text-sm font-semibold text-[#140249]">
              Visning
              <Select name="status" defaultValue={statusFilter} className="border-[#5A458B]/30 bg-white text-[#1A1626]">
                <option value="active">Åpne og usorterte</option>
                <option value="closed">Lukkede</option>
                <option value="archived">Arkiverte</option>
                <option value="all">Alle</option>
              </Select>
            </label>
            <Button type="submit" variant="secondary" className="rounded-xl">
              Filtrer
            </Button>
          </form>

          {typedItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#5A458B]/25 bg-[#FCF6EC] p-8 text-sm text-[#4A3D6A]">
              Ingen kontaktbedrifter funnet for dette filteret.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#5A458B]/10 text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-[#4B367A]">
                    <th className="px-4 py-3">Varsel</th>
                    <th className="px-4 py-3">Bedrift</th>
                    <th className="px-4 py-3">Sakseier</th>
                    <th className="px-4 py-3">Aktiv sak</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Siste aktivitet</th>
                    <th className="px-4 py-3">Saker</th>
                    <th className="px-4 py-3">Checklist</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#5A458B]/10">
                  {typedItems.map((item) => (
                    <tr
                      key={item.company.id}
                      className={`contact-overview-row align-top ${item.unreadCount > 0 ? "contact-overview-row--unread bg-[#FFF6E8]" : "bg-white"}`}
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
                          className="block"
                        >
                          <span className="font-semibold text-[#140249]">{item.company.display_name}</span>
                          <span className="mt-1 block text-xs text-[#5B5078]">
                            {item.company.primary_domain}
                            {item.company.primary_email ? ` · ${item.company.primary_email}` : ""}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-[#30224F]">
                        {item.owner ? item.owner.full_name ?? "Admin" : "Utdelt"}
                      </td>
                      <td className="px-4 py-4 text-[#30224F]">
                        {item.activeCase ? (
                          <>
                            <p className="font-medium text-[#140249]">{item.activeCase.title}</p>
                            <p className="mt-1 text-xs text-[#5B5078]">{item.activeCase.case_number}</p>
                          </>
                        ) : (
                          "Ingen saker"
                        )}
                      </td>
                      <td className="px-4 py-4 text-[#30224F]">{item.eventName ?? "Uten event"}</td>
                      <td className="px-4 py-4 text-[#30224F]">{formatContactOverviewTimestamp(item.latestMessageAt)}</td>
                      <td className="px-4 py-4 font-semibold text-[#140249]">{item.openCaseCount}</td>
                      <td className="px-4 py-4 font-semibold text-[#30224F]">
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
  );
}
