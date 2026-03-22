import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { Stat } from "@/components/ui/stat";
import { requireRole } from "@/lib/auth";
import {
  applyCrmLeadFilters,
  buildCrmCompanyCards,
  buildCrmMetrics,
  CRM_PIPELINE_STAGES,
  getLeadAgeInDays,
  getMissingReplyLeads,
  type CrmDataset,
} from "@/lib/crm";
import { loadCrmEntriesFromSupabase } from "@/lib/crm-supabase";
import { updateCrmCompanyPipeline, updateCrmLead } from "./actions";
import { CrmRefreshControls } from "./refresh-controls";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function leadStatusVariant(status: string): "default" | "success" | "warning" | "info" {
  const normalized = status.trim().toLowerCase().replace(/_/g, " ");

  if (normalized === "replied") return "success";
  if (normalized === "pending approval" || normalized === "edit requested") return "warning";
  if (normalized === "bounced") return "warning";
  if (normalized === "waiting") return "info";

  return "default";
}

function companyStatusVariant(status: string): "default" | "success" | "warning" | "info" {
  const normalized = status.trim().toLowerCase();

  if (normalized === "dialog" || normalized === "påmeldt") return "success";
  if (normalized === "tapt") return "warning";
  if (normalized === "venter svar") return "info";

  return "default";
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return parsed.toLocaleString("nb-NO");
}

function formatLeadStatusLabel(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "-";
  if (normalized === "pending_approval") return "Venter godkjenning";
  if (normalized === "edit_requested") return "Endring ønsket";
  if (normalized === "waiting") return "Venter svar";
  if (normalized === "replied") return "Besvart";
  if (normalized === "bounced") return "Avvist";
  return value.replace(/_/g, " ");
}

function formatAgeLabel(days: number) {
  if (days <= 0) return "Sendt i dag";
  if (days === 1) return "Sendt for 1 dag siden";
  return `Sendt for ${days} dager siden`;
}

function ageTone(days: number) {
  if (days >= 14) return "border-error/40 bg-error/5";
  if (days >= 7) return "border-warning/40 bg-warning/5";
  return "border-primary/10 bg-surface";
}

function toDateTimeLocalValue(value: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return "";

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

export const dynamic = "force-dynamic";

export default async function AdminCrmPage({ searchParams }: PageProps) {
  await requireRole("admin");

  const params = await searchParams;
  const discordGuildId = process.env.CRM_DISCORD_GUILD_ID?.trim() ?? "";
  const query = firstValue(params.q).trim();
  const leadStatus = firstValue(params.leadStatus).trim();
  const companyStatus = firstValue(params.companyStatus).trim();
  const eventName = firstValue(params.event).trim();
  const temperature = firstValue(params.temperature).trim();
  const stopReason = firstValue(params.stopReason).trim();
  const sequenceStep = firstValue(params.sequenceStep).trim();

  let datasetError = "";
  let dataset: CrmDataset | null = null;

  try {
    dataset = await loadCrmEntriesFromSupabase();
  } catch (error) {
    datasetError = error instanceof Error ? error.message : "Kunne ikke laste CRM-data.";
  }

  if (!dataset) {
    return (
      <div className="flex flex-col gap-8">
        <SectionHeader
          eyebrow="CRM"
          title="Henvendelsesdashbord"
          description="Klarte ikke å laste CRM-data fra databasen."
        />
        <Card className="border border-warning/30 bg-warning/10 text-sm text-ink/90">
          <p className="font-semibold text-primary">Feil ved CRM-data</p>
          <p className="mt-2">{datasetError}</p>
        </Card>
      </div>
    );
  }

  const filteredLeads = applyCrmLeadFilters(dataset.leads, {
    query,
    leadStatus,
    companyStatus,
    eventName,
    temperature,
    stopReason,
    sequenceStep,
  });
  const metrics = buildCrmMetrics(filteredLeads);
  const companyCards = buildCrmCompanyCards(filteredLeads);
  const missingReplyLeads = getMissingReplyLeads(filteredLeads);

  const apiParams = new URLSearchParams();
  if (query) apiParams.set("q", query);
  if (leadStatus) apiParams.set("leadStatus", leadStatus);
  if (companyStatus) apiParams.set("companyStatus", companyStatus);
  if (eventName) apiParams.set("event", eventName);
  if (temperature) apiParams.set("temperature", temperature);
  if (stopReason) apiParams.set("stopReason", stopReason);
  if (sequenceStep) apiParams.set("sequenceStep", sequenceStep);
  const apiHref = apiParams.toString()
    ? `/api/admin/crm/leads?${apiParams.toString()}`
    : "/api/admin/crm/leads";

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="CRM"
        title="OSH CRM"
        description="Følg opp henvendelser, styr pipeline per bedrift og hold oversikt over dialog og avtalestatus."
        actions={
          <>
            <Link
              className="inline-flex items-center justify-center rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary transition hover:border-secondary hover:bg-secondary/10 hover:text-secondary"
              href="/admin/crm"
            >
              Nullstill filter
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary transition hover:border-secondary hover:bg-secondary/10 hover:text-secondary"
              href={apiHref}
            >
              Åpne API (JSON)
            </Link>
            <CrmRefreshControls />
          </>
        }
      />


      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Bedrifter" value={metrics.totalCompanies} hint={`${metrics.totalLeads} leads i filtrert utvalg`} />
        <Stat label="Mangler svar" value={metrics.missingReplies} href="/admin/crm?leadStatus=waiting" />
        <Stat label="I dialog" value={metrics.dialogueCompanies} href="/admin/crm?companyStatus=Dialog" />
        <Stat label="Påmeldt" value={metrics.signedCompanies} href="/admin/crm?companyStatus=Påmeldt" />
        <Stat label="Tapt" value={metrics.lostCompanies} href="/admin/crm?companyStatus=Tapt" />
        <Stat label="Pipelinesum" value={Math.round(metrics.pipelineTotal)} hint="Sum av pipelineverdi" />
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Oppfølging</p>
            <h2 className="text-xl font-bold text-primary">Mailer som mangler svar</h2>
            <p className="text-sm text-ink/70">Viser kun leads med <code>waiting</code> og uten aktiv snooze.</p>
          </div>
          <p className="text-xs text-ink/60">
            Oppdatert: {new Date(dataset.fetchedAt).toLocaleString("nb-NO")}
          </p>
        </div>

        {missingReplyLeads.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen åpne svar som venter akkurat nå.</p>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {missingReplyLeads.map((lead) => {
              const ageInDays = getLeadAgeInDays(lead);
              return (
                <Card key={`missing-${lead.leadId}`} className={`border p-5 ${ageTone(ageInDays)}`}>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-lg font-bold text-primary">{lead.company || "Ukjent bedrift"}</p>
                        <p className="text-sm font-medium text-ink/80">{lead.contactName || "Ukjent kontakt"}</p>
                        <p className="text-sm text-ink/70">{lead.contactEmail || "-"}</p>
                      </div>
                      <Badge variant={ageInDays >= 14 ? "warning" : "info"}>{formatAgeLabel(ageInDays)}</Badge>
                    </div>

                    <div className="grid gap-2 text-sm text-ink/70 md:grid-cols-2">
                      <div>
                        <span className="font-semibold text-primary">Event:</span> {lead.eventName || "-"}
                      </div>
                      <div>
                        <span className="font-semibold text-primary">Leadstatus:</span> {formatLeadStatusLabel(lead.leadStatus)}
                      </div>
                      <div>
                        <span className="font-semibold text-primary">Sendt:</span> {formatDateTime(lead.sentAtIso)}
                      </div>
                      <div>
                        <span className="font-semibold text-primary">Oppdatert:</span> {formatDateTime(lead.updatedAtIso)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-primary">
                      <Link href={`#lead-${lead.rowNumber}`} className="underline-offset-2 hover:underline">
                        Åpne i tabell
                      </Link>
                      <a
                        className="underline-offset-2 hover:underline"
                        href={`https://docs.google.com/spreadsheets/d/${dataset.sheetId}/edit#gid=0&range=A${lead.rowNumber}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Åpne i arket
                      </a>
                      {discordGuildId && lead.companyChannelId && lead.sourceMessageId ? (
                        <a
                          className="underline-offset-2 hover:underline"
                          href={`https://discord.com/channels/${discordGuildId}/${lead.companyChannelId}/${lead.sourceMessageId}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Åpne Discord-melding
                        </a>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Pipeline</p>
          <h2 className="text-xl font-bold text-primary">Bedriftsboard</h2>
          <p className="text-sm text-ink/70">Kortene grupperes på bedrift + event. Endring av pipeline oppdaterer alle tilhørende rader i arket.</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-5">
          {CRM_PIPELINE_STAGES.map((stage) => {
            const stageCards = companyCards.filter((card) => card.pipelineStage === stage);
            return (
              <div key={stage} className="flex min-h-[18rem] flex-col rounded-2xl border border-primary/10 bg-mist/40 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-primary">{stage}</p>
                    <p className="text-xs text-ink/60">{stageCards.length} bedrifter</p>
                  </div>
                  <Badge variant={companyStatusVariant(stage)}>{stage}</Badge>
                </div>

                <div className="flex flex-1 flex-col gap-3">
                  {stageCards.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-primary/10 bg-surface/70 p-4 text-sm text-ink/60">
                      Ingen bedrifter i dette steget.
                    </div>
                  ) : (
                    stageCards.map((card) => (
                      <Card key={card.key} className="flex flex-col gap-4 p-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-primary">{card.company || "Ukjent bedrift"}</p>
                              <p className="text-xs text-ink/60">{card.eventName || "Uten event"}</p>
                            </div>
                            <Badge variant={companyStatusVariant(card.pipelineStage)}>{card.pipelineStage}</Badge>
                          </div>
                          <div className="grid gap-1 text-xs text-ink/70">
                            <p>{card.totalContacts} kontakter</p>
                            <p>{card.openLeadCount} åpne leads</p>
                            <p>{card.waitingReplyCount} venter svar</p>
                            <p>Pipelinesum: {Math.round(card.pipelineValueTotal)}</p>
                            <p>Sist sendt: {formatDateTime(card.lastSentAtIso)}</p>
                            <p>Sist oppdatert: {formatDateTime(card.lastUpdatedAtIso)}</p>
                          </div>
                        </div>

                        <form action={updateCrmCompanyPipeline} className="flex flex-col gap-2">
                          <input type="hidden" name="company" value={card.company} />
                          <input type="hidden" name="eventName" value={card.eventName} />
                          <Select name="companyStatus" defaultValue={card.pipelineStage}>
                            {CRM_PIPELINE_STAGES.map((value) => (
                              <option key={`${card.key}-${value}`} value={value}>
                                {value}
                              </option>
                            ))}
                          </Select>
                          <Button variant="secondary" type="submit" disabled={!canWrite} className="rounded-xl px-4 py-2 text-xs">
                            Lagre pipeline
                          </Button>
                        </form>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <form method="get" className="grid gap-3 md:grid-cols-8 md:items-end">
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Søk
            <Input name="q" defaultValue={query} placeholder="Navn, e-post, bedrift, tråd, kanal" />
          </label>

          <label className="text-sm font-semibold text-primary">
            Leadstatus
            <Select name="leadStatus" defaultValue={leadStatus || "all"}>
              <option value="all">Alle</option>
              {dataset.options.leadStatuses.map((value) => (
                <option key={value} value={value}>
                  {formatLeadStatusLabel(value)}
                </option>
              ))}
            </Select>
          </label>

          <label className="text-sm font-semibold text-primary">
            Pipeline
            <Select name="companyStatus" defaultValue={companyStatus || "all"}>
              <option value="all">Alle</option>
              {dataset.options.companyStatuses.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </label>

          <label className="text-sm font-semibold text-primary">
            Event
            <Select name="event" defaultValue={eventName || "all"}>
              <option value="all">Alle</option>
              {dataset.options.events.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </label>

          <label className="text-sm font-semibold text-primary">
            Temperatur
            <Select name="temperature" defaultValue={temperature || "all"}>
              <option value="all">Alle</option>
              {dataset.options.temperatures.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </label>

          <label className="text-sm font-semibold text-primary">
            Stop reason
            <Select name="stopReason" defaultValue={stopReason || "all"}>
              <option value="all">Alle</option>
              {dataset.options.stopReasons.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </label>

          <label className="text-sm font-semibold text-primary">
            Sequence step
            <Select name="sequenceStep" defaultValue={sequenceStep || "all"}>
              <option value="all">Alle</option>
              {dataset.options.sequenceSteps.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </label>

          <div className="flex items-center justify-end gap-3 md:col-span-8">
            <Button variant="secondary" type="submit">
              Filtrer
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-x-auto">
        <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Detaljer</p>
            <h2 className="text-xl font-bold text-primary">Lead-tabell</h2>
            <p className="text-sm text-ink/70">Oppdater leadstatus, snooze, stop reason og pipeline direkte fra admin.</p>
          </div>
          <p className="text-xs text-ink/60">{filteredLeads.length} rader i gjeldende utvalg</p>
        </div>

        {filteredLeads.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen leads matcher filtrene.</p>
        ) : (
          <table className="min-w-full divide-y divide-primary/10 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-primary/60">
                <th className="px-3 py-2">Kontakt</th>
                <th className="px-3 py-2">Bedrift / Event</th>
                <th className="px-3 py-2">Leadstatus</th>
                <th className="px-3 py-2">Pipeline</th>
                <th className="px-3 py-2">Oppfølging</th>
                <th className="px-3 py-2">Discord</th>
                <th className="px-3 py-2">Rediger</th>
                <th className="px-3 py-2">Rad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {filteredLeads.map((lead) => {
                const ageInDays = getLeadAgeInDays(lead);
                const currentCompanyStatus = lead.companyStatus || "Kontaktet";
                return (
                  <tr key={lead.leadId} id={`lead-${lead.rowNumber}`} className="align-top">
                    <td className="px-3 py-3 text-ink/80">
                      <div className="font-semibold text-primary">{lead.contactName || "Ukjent"}</div>
                      <div className="text-xs text-ink/60">{lead.contactEmail || "-"}</div>
                      <div className="mt-1 text-xs text-ink/60">{lead.subject || "-"}</div>
                    </td>
                    <td className="px-3 py-3 text-ink/80">
                      <div className="font-semibold text-primary">{lead.company || "-"}</div>
                      <div className="text-xs text-ink/60">{lead.eventName || "-"}</div>
                      <div className="text-xs text-ink/60">Temperatur: {lead.temperature || "-"}</div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={leadStatusVariant(lead.leadStatus)}>{formatLeadStatusLabel(lead.leadStatus)}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-2">
                        <Badge variant={companyStatusVariant(currentCompanyStatus)}>{currentCompanyStatus}</Badge>
                        <div className="text-xs text-ink/60">Verdi: {lead.pipelineValue || "0"}</div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-ink/80">
                      <div>Sendt: {formatDateTime(lead.sentAtIso)}</div>
                      <div className="text-xs text-ink/60">Oppdatert: {formatDateTime(lead.updatedAtIso)}</div>
                      <div className="mt-1 text-xs text-ink/60">{formatAgeLabel(ageInDays)}</div>
                      <div className="mt-1 text-xs text-ink/60">Stop reason: {lead.stopReason || "-"}</div>
                      <div className="text-xs text-ink/60">Snooze til: {formatDateTime(lead.snoozeUntilIso)}</div>
                    </td>
                    <td className="px-3 py-3 text-ink/80">
                      <div>
                        {discordGuildId && lead.companyChannelId ? (
                          <a
                            className="text-primary underline-offset-2 hover:underline"
                            href={`https://discord.com/channels/${discordGuildId}/${lead.companyChannelId}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {lead.companyChannelName || lead.companyChannelId}
                          </a>
                        ) : (
                          lead.companyChannelName || "-"
                        )}
                      </div>
                      <div className="mt-1 text-xs break-all text-ink/60">Tråd: {lead.threadId || "-"}</div>
                      <div className="text-xs break-all text-ink/60">
                        Melding: {lead.sourceMessageId || "-"}
                        {discordGuildId && lead.companyChannelId && lead.sourceMessageId ? (
                          <>
                            {" "}
                            ·{" "}
                            <a
                              className="text-primary underline-offset-2 hover:underline"
                              href={`https://discord.com/channels/${discordGuildId}/${lead.companyChannelId}/${lead.sourceMessageId}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              åpne
                            </a>
                          </>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-ink/80">
                      <form action={updateCrmLead} className="flex min-w-[15rem] flex-col gap-2">
                        <input type="hidden" name="leadId" value={lead.leadId} />
                        <input type="hidden" name="company" value={lead.company} />
                        <input type="hidden" name="eventName" value={lead.eventName} />

                        <Select name="leadStatus" defaultValue={lead.leadStatus || "waiting"}>
                          {dataset.options.leadStatuses.map((value) => (
                            <option key={`${lead.leadId}-lead-${value}`} value={value}>
                              {formatLeadStatusLabel(value)}
                            </option>
                          ))}
                        </Select>

                        <Select name="companyStatus" defaultValue={currentCompanyStatus}>
                          {CRM_PIPELINE_STAGES.map((value) => (
                            <option key={`${lead.leadId}-company-${value}`} value={value}>
                              {value}
                            </option>
                          ))}
                        </Select>

                        <Input name="stopReason" defaultValue={lead.stopReason} placeholder="Stop reason" />
                        <Input name="snoozeUntilIso" type="datetime-local" defaultValue={toDateTimeLocalValue(lead.snoozeUntilIso)} />

                        <Button variant="secondary" type="submit" disabled={!canWrite} className="rounded-xl px-4 py-2 text-xs">
                          Lagre rad
                        </Button>
                      </form>
                    </td>
                    <td className="px-3 py-3 text-ink/80">
                      <a
                        className="text-primary underline-offset-2 hover:underline"
                        href={`https://docs.google.com/spreadsheets/d/${dataset.sheetId}/edit#gid=0&range=A${lead.rowNumber}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        A{lead.rowNumber}
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

