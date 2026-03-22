import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { CrmLead, CrmPipelineStage, CrmDataset } from "@/lib/crm";
import {
  CRM_PIPELINE_STAGES,
  buildCrmCompanyCards,
  getMissingReplyLeads,
  buildCrmMetrics,
} from "@/lib/crm";
import type { TableRow } from "@/lib/types/database";

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

export async function loadCrmEntriesFromSupabase(): Promise<CrmDataset> {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("crm_pipeline_entries")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`CRM Supabase fetch failed: ${error.message}`);

  const leads = (data ?? []).map((row, i) => dbRowToCrmLead(row, i));
  const companyCards = buildCrmCompanyCards(leads);
  const missingReplyLeads = getMissingReplyLeads(leads);
  const metrics = buildCrmMetrics(leads, companyCards);
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

  const { error } = await supabase
    .from("crm_pipeline_entries")
    .update({ company_status: stage })
    .eq("company", company)
    .eq("event_name", eventName);

  if (error) throw new Error(`CRM pipeline stage update failed: ${error.message}`);
}
