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
  buildCrmMetrics,
  loadCrmDataset,
  type CrmDataset,
} from "@/lib/crm";

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
  if (normalized === "pending approval") return "warning";
  if (normalized === "bounced") return "warning";
  if (normalized === "waiting" || normalized === "edit requested") return "info";

  return "default";
}

function companyStatusVariant(status: string): "default" | "success" | "warning" | "info" {
  const normalized = status.trim().toLowerCase();

  if (normalized.includes("dialogue")) return "success";
  if (normalized.includes("closed lost")) return "warning";
  if (normalized.includes("contacted")) return "info";

  return "default";
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return parsed.toLocaleString("nb-NO");
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
    dataset = await loadCrmDataset();
  } catch (error) {
    datasetError = error instanceof Error ? error.message : "Kunne ikke laste CRM-data.";
  }

  if (!dataset) {
    return (
      <div className="flex flex-col gap-8">
        <SectionHeader
          eyebrow="CRM"
          title="Leads dashboard"
          description="Klarte ikke a laste Google Sheet-data."
        />

        <Card className="border border-warning/30 bg-warning/10 text-sm text-ink/90">
          <p className="font-semibold text-primary">Feil ved CRM-data</p>
          <p className="mt-2">{datasetError}</p>
          <p className="mt-2">
            Sjekk <code>CRM_GOOGLE_SHEET_ID</code> og tilgang til arket. For private ark: sett Google auth
            (<code>CRM_GOOGLE_SERVICE_ACCOUNT_EMAIL</code> + <code>CRM_GOOGLE_PRIVATE_KEY</code>, eller <code>GOOGLE_SHEETS_API_KEY</code>).
          </p>
        </Card>
      </div>
    );
  }

  const filtered = applyCrmLeadFilters(dataset.leads, {
    query,
    leadStatus,
    companyStatus,
    eventName,
    temperature,
    stopReason,
    sequenceStep,
  });
  const metrics = buildCrmMetrics(filtered);

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
        title="OSH CRM Leads"
        description="Live masterdata fra Google Sheet + Discord/bot-felter (thread, source message, kanal)."
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
              Apne API (JSON)
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Totalt (filtrert)" value={metrics.totalLeads} hint={`${dataset.leads.length} totalt i arket`} />
        <Stat label="Pending approval" value={metrics.pendingApproval} />
        <Stat label="Waiting/Edit requested" value={metrics.waiting} />
        <Stat label="Replied" value={metrics.replied} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Bounced" value={metrics.bounced} />
        <Stat label="Dialogue" value={metrics.dialogue} />
        <Stat label="Closed Lost" value={metrics.closedLost} />
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Stat label="Pipeline sum" value={Math.round(metrics.pipelineTotal)} hint="Summer av PipelineValue i filtrert utvalg" />
      </div>

      <Card className="flex flex-col gap-4">
        <form method="get" className="grid gap-3 md:grid-cols-8 md:items-end">
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Sok
            <Input name="q" defaultValue={query} placeholder="Navn, e-post, bedrift, thread, kanal" />
          </label>

          <label className="text-sm font-semibold text-primary">
            Leadstatus
            <Select name="leadStatus" defaultValue={leadStatus || "all"}>
              <option value="all">Alle</option>
              {dataset.options.leadStatuses.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </label>

          <label className="text-sm font-semibold text-primary">
            Selskapsstatus
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

          <div className="md:col-span-8 flex items-center justify-between gap-3">
            <p className="text-xs text-ink/60">
              Sist hentet: {new Date(dataset.fetchedAt).toLocaleString("nb-NO")} · Kilde: {dataset.sheetRange}
            </p>
            <Button variant="secondary" type="submit">Filtrer</Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-x-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen leads matcher filtrene.</p>
        ) : (
          <table className="min-w-full divide-y divide-primary/10 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-primary/60">
                <th className="px-3 py-2">Kontakt</th>
                <th className="px-3 py-2">Bedrift</th>
                <th className="px-3 py-2">Leadstatus</th>
                <th className="px-3 py-2">Selskapsstatus</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Tid</th>
                <th className="px-3 py-2">Discord kanal</th>
                <th className="px-3 py-2">Trad / Message</th>
                <th className="px-3 py-2">Stop/Pipeline</th>
                <th className="px-3 py-2">Rad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {filtered.map((lead) => (
                <tr key={lead.leadId} className="align-top">
                  <td className="px-3 py-3 text-ink/80">
                    <div className="font-semibold text-primary">{lead.contactName || "Ukjent"}</div>
                    <div className="text-xs text-ink/60">{lead.contactEmail || "-"}</div>
                    <div className="text-xs text-ink/60 mt-1">{lead.subject || "-"}</div>
                  </td>
                  <td className="px-3 py-3 text-ink/80">{lead.company || "-"}</td>
                  <td className="px-3 py-3">
                    <Badge variant={leadStatusVariant(lead.leadStatus)}>{lead.leadStatus || "-"}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={companyStatusVariant(lead.companyStatus)}>{lead.companyStatus || "-"}</Badge>
                  </td>
                  <td className="px-3 py-3 text-ink/80">
                    <div>{lead.eventName || "-"}</div>
                    <div className="text-xs text-ink/60">{lead.temperature || "-"}</div>
                  </td>
                  <td className="px-3 py-3 text-ink/80">
                    <div>Sendt: {formatDateTime(lead.sentAtIso)}</div>
                    <div className="text-xs text-ink/60">Oppdatert: {formatDateTime(lead.updatedAtIso)}</div>
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
                    <div className="text-xs text-ink/60 break-all">{lead.companyChannelId || "-"}</div>
                  </td>
                  <td className="px-3 py-3 text-ink/80">
                    <div className="text-xs break-all">Thread: {lead.threadId || "-"}</div>
                    <div className="text-xs text-ink/60 break-all">
                      Msg: {lead.sourceMessageId || "-"}
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
                            apne
                          </a>
                        </>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-ink/80">
                    <div>{lead.stopReason || "-"}</div>
                    <div className="text-xs text-ink/60">Step: {lead.sequenceStep || "-"}</div>
                    <div className="text-xs text-ink/60">Pipeline: {lead.pipelineValue || "0"}</div>
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
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
