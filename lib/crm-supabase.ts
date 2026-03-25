import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { CrmLead, CrmPipelineStage, CrmDataset } from "@/lib/crm";
import {
  CRM_PIPELINE_STAGES,
  buildCrmCompanyCards,
  getMissingReplyLeads,
  buildCrmMetrics,
  normalizeCrmText,
  normalizePipelineStage,
} from "@/lib/crm";
import type { TableRow } from "@/lib/types/database";
import type { CrmSyncField } from "@/lib/crm-sheet-sync";

type DbEntry = TableRow<"crm_pipeline_entries">;

export type CrmEntryUpsert = {
  leadId: string;
  company: string;
  contactName?: string;
  contactEmail?: string;
  subject?: string;
  threadId?: string;
  sourceMessageId?: string;
  sentAtIso?: string;
  sequenceStep?: string;
  leadStatus?: string;
  stopReason?: string;
  snoozeUntilIso?: string;
  companyStatus?: CrmPipelineStage;
  eventName?: string;
  temperature?: string;
  pipelineValue?: number;
  companyChannelName?: string;
  companyChannelId?: string;
};

type CrmEntryFields = Partial<Omit<CrmEntryUpsert, "leadId">>;

function dbRowToCrmLead(row: DbEntry, index: number): CrmLead {
  return {
    rowNumber: index + 2, // 1-based, row 1 = headers
    leadId: row.lead_id,
    company: row.company,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    subject: row.subject,
    threadId: row.thread_id,
    sourceMessageId: row.source_message_id,
    sentAtIso: row.sent_at ?? "",
    sequenceStep: row.sequence_step,
    leadStatus: row.lead_status,
    stopReason: row.stop_reason,
    snoozeUntilIso: row.snooze_until ?? "",
    companyChannelName: row.company_channel_name,
    companyChannelId: row.company_channel_id,
    companyStatus: row.company_status as CrmPipelineStage,
    eventName: row.event_name,
    temperature: row.temperature,
    pipelineValue: String(row.pipeline_value),
    updatedAtIso: row.updated_at,
    raw: {},
  };
}

function parsePipelineValue(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function matchesCompanyEvent(row: Pick<DbEntry, "company" | "event_name">, company: string, eventName: string) {
  const normalizedCompany = normalizeCrmText(company);
  const normalizedEvent = normalizeCrmText(eventName);
  if (!normalizedCompany) return false;

  const companyMatches = normalizeCrmText(row.company) === normalizedCompany;
  if (!companyMatches) return false;
  if (!normalizedEvent) return true;

  return normalizeCrmText(row.event_name) === normalizedEvent;
}

async function listMatchingCompanyEventEntries(company: string, eventName: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("crm_pipeline_entries")
    .select("*");

  if (error) throw new Error(`CRM Supabase fetch failed: ${error.message}`);
  return ((data ?? []) as DbEntry[]).filter((row) => matchesCompanyEvent(row, company, eventName));
}

export async function loadCrmEntriesFromSupabase(): Promise<CrmDataset> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("crm_pipeline_entries")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`CRM Supabase fetch failed: ${error.message}`);

  const typedData = (data ?? []) as DbEntry[];
  const leads = typedData.map((row, i) => dbRowToCrmLead(row, i));
  const companyCards = buildCrmCompanyCards(leads);
  const missingReplyLeads = getMissingReplyLeads(leads);
  const metrics = buildCrmMetrics(leads);
  const options = {
    leadStatuses: [...new Set(leads.map((l) => l.leadStatus).filter(Boolean))],
    companyStatuses: [...CRM_PIPELINE_STAGES] as CrmPipelineStage[],
    events: [...new Set(leads.map((l) => l.eventName).filter(Boolean))],
    temperatures: [...new Set(leads.map((l) => l.temperature).filter(Boolean))],
    stopReasons: [...new Set(leads.map((l) => l.stopReason).filter(Boolean))],
    sequenceSteps: [...new Set(leads.map((l) => l.sequenceStep).filter(Boolean))],
  };

  return {
    fetchedAt: new Date().toISOString(),
    sheetId: "",
    sheetRange: "",
    headers: [],
    leads,
    companyCards,
    missingReplyLeads,
    options,
    metrics,
  };
}

export async function getCrmEntry(leadId: string): Promise<CrmLead | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("crm_pipeline_entries")
    .select("*")
    .eq("lead_id", leadId)
    .single();

  if (error || !data) return null;
  return dbRowToCrmLead(data, 0);
}

export async function upsertCrmEntry(input: CrmEntryUpsert): Promise<void> {
  const supabase = createAdminSupabaseClient();

  const { error } = await supabase.from("crm_pipeline_entries").upsert(
    {
      lead_id: input.leadId,
      company: input.company,
      contact_name: input.contactName ?? "",
      contact_email: input.contactEmail ?? "",
      subject: input.subject ?? "",
      thread_id: input.threadId ?? "",
      source_message_id: input.sourceMessageId ?? "",
      sent_at: input.sentAtIso || null,
      snooze_until: input.snoozeUntilIso || null,
      sequence_step: input.sequenceStep ?? "",
      lead_status: input.leadStatus ?? "waiting",
      stop_reason: input.stopReason ?? "",
      company_status: (input.companyStatus as DbEntry["company_status"]) ?? "Kontaktet",
      event_name: input.eventName ?? "",
      temperature: input.temperature ?? "",
      pipeline_value: input.pipelineValue ?? 0,
      company_channel_name: input.companyChannelName ?? "",
      company_channel_id: input.companyChannelId ?? "",
    },
    { onConflict: "lead_id" }
  );

  if (error) throw new Error(`CRM upsert failed: ${error.message}`);
}

export async function syncCrmLeadEntry(input: {
  leadId: string;
  fields: CrmEntryFields;
}): Promise<void> {
  const existing = await getCrmEntry(input.leadId);
  const nextCompany = input.fields.company ?? existing?.company ?? "";

  if (!nextCompany.trim()) {
    throw new Error("CRM lead requires company before it can be synced.");
  }

  const nextCompanyStatus =
    input.fields.companyStatus ??
    (existing?.companyStatus ? normalizePipelineStage(existing.companyStatus) || undefined : undefined);

  await upsertCrmEntry({
    leadId: input.leadId,
    company: nextCompany,
    contactName: input.fields.contactName ?? existing?.contactName ?? "",
    contactEmail: input.fields.contactEmail ?? existing?.contactEmail ?? "",
    subject: input.fields.subject ?? existing?.subject ?? "",
    threadId: input.fields.threadId ?? existing?.threadId ?? "",
    sourceMessageId: input.fields.sourceMessageId ?? existing?.sourceMessageId ?? "",
    sentAtIso: input.fields.sentAtIso ?? existing?.sentAtIso ?? "",
    sequenceStep: input.fields.sequenceStep ?? existing?.sequenceStep ?? "",
    leadStatus: input.fields.leadStatus ?? existing?.leadStatus ?? "",
    stopReason: input.fields.stopReason ?? existing?.stopReason ?? "",
    snoozeUntilIso: input.fields.snoozeUntilIso ?? existing?.snoozeUntilIso ?? "",
    companyStatus: nextCompanyStatus,
    eventName: input.fields.eventName ?? existing?.eventName ?? "",
    temperature: input.fields.temperature ?? existing?.temperature ?? "",
    pipelineValue: input.fields.pipelineValue ?? parsePipelineValue(existing?.pipelineValue),
    companyChannelName: input.fields.companyChannelName ?? existing?.companyChannelName ?? "",
    companyChannelId: input.fields.companyChannelId ?? existing?.companyChannelId ?? "",
  });
}

export async function syncCrmLeadEntryFromFields(input: {
  leadId: string;
  updates: Partial<Record<CrmSyncField, string>>;
}): Promise<void> {
  const companyStatus = input.updates.companyStatus
    ? normalizePipelineStage(input.updates.companyStatus) || undefined
    : undefined;

  await syncCrmLeadEntry({
    leadId: input.leadId,
    fields: {
      company: input.updates.company,
      contactName: input.updates.contactName,
      contactEmail: input.updates.contactEmail,
      subject: input.updates.subject,
      threadId: input.updates.threadId,
      sourceMessageId: input.updates.sourceMessageId,
      sentAtIso: input.updates.sentAtIso,
      sequenceStep: input.updates.sequenceStep,
      leadStatus: input.updates.leadStatus,
      stopReason: input.updates.stopReason,
      snoozeUntilIso: input.updates.snoozeUntilIso,
      companyStatus,
      eventName: input.updates.eventName,
      temperature: input.updates.temperature,
      pipelineValue: parsePipelineValue(input.updates.pipelineValue),
      companyChannelName: input.updates.companyChannelName,
      companyChannelId: input.updates.companyChannelId,
    },
  });
}

export async function updateCrmLeadFields(
  leadId: string,
  fields: {
    leadStatus?: string;
    stopReason?: string;
    snoozeUntilIso?: string;
    companyStatus?: CrmPipelineStage;
  }
): Promise<void> {
  const supabase = createAdminSupabaseClient();

  const update: Record<string, unknown> = {};
  if (fields.leadStatus !== undefined) update.lead_status = fields.leadStatus;
  if (fields.stopReason !== undefined) update.stop_reason = fields.stopReason;
  if (fields.snoozeUntilIso !== undefined) update.snooze_until = fields.snoozeUntilIso || null;
  if (fields.companyStatus !== undefined) update.company_status = fields.companyStatus;

  const { error } = await supabase
    .from("crm_pipeline_entries")
    .update(update)
    .eq("lead_id", leadId);

  if (error) throw new Error(`CRM lead update failed: ${error.message}`);
}

export async function updateCompanyPipelineStage(
  company: string,
  eventName: string,
  stage: CrmPipelineStage
): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const matchingEntries = await listMatchingCompanyEventEntries(company, eventName);

  if (matchingEntries.length === 0) {
    throw new Error("CRM company pipeline stage update failed: no matching leads found.");
  }

  const leadIds = matchingEntries.map((row) => row.lead_id);
  const { error } = await supabase
    .from("crm_pipeline_entries")
    .update({ company_status: stage })
    .in("lead_id", leadIds);

  if (error) throw new Error(`CRM pipeline stage update failed: ${error.message}`);
}

export async function syncCompanyEventPipelineStage(
  company: string,
  eventName: string,
  stage: CrmPipelineStage,
  extraFields: {
    leadStatus?: string;
    stopReason?: string;
  } = {},
) {
  const supabase = createAdminSupabaseClient();
  const matchingEntries = await listMatchingCompanyEventEntries(company, eventName);
  if (matchingEntries.length === 0) return 0;

  const leadIds = matchingEntries.map((row) => row.lead_id);
  const update: Partial<DbEntry> = {
    company_status: stage,
  };

  if (extraFields.leadStatus !== undefined) {
    update.lead_status = extraFields.leadStatus;
  }
  if (extraFields.stopReason !== undefined) {
    update.stop_reason = extraFields.stopReason;
  }

  const { error } = await supabase
    .from("crm_pipeline_entries")
    .update(update)
    .in("lead_id", leadIds);

  if (error) throw new Error(`CRM company-event sync failed: ${error.message}`);
  return leadIds.length;
}

export async function listCompanyEventCrmEntries(company: string, eventName: string) {
  return listMatchingCompanyEventEntries(company, eventName);
}
