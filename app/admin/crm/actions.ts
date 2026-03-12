"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { normalizePipelineStage } from "@/lib/crm";
import { syncCompanyEventToGoogleSheet, syncLeadToGoogleSheet } from "@/lib/crm-sheet-sync";

function normalizeTextValue(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function toOptionalIso(value: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    throw new Error("Ugyldig snooze-dato.");
  }
  return parsed.toISOString();
}

export async function updateCrmCompanyPipeline(formData: FormData) {
  await requireRole("admin");

  const company = normalizeTextValue(formData.get("company"));
  const eventName = normalizeTextValue(formData.get("eventName"));
  const companyStatus = normalizePipelineStage(normalizeTextValue(formData.get("companyStatus")));

  if (!company) {
    throw new Error("Bedrift mangler for pipeline-oppdatering.");
  }
  if (!companyStatus) {
    throw new Error("Velg en gyldig pipeline-status.");
  }

  await syncCompanyEventToGoogleSheet({
    company,
    eventName,
    updates: {
      companyStatus,
    },
  });

  revalidatePath("/admin/crm");
}

export async function updateCrmLead(formData: FormData) {
  await requireRole("admin");

  const leadId = normalizeTextValue(formData.get("leadId"));
  const company = normalizeTextValue(formData.get("company"));
  const eventName = normalizeTextValue(formData.get("eventName"));
  const leadStatus = normalizeTextValue(formData.get("leadStatus"));
  const stopReason = normalizeTextValue(formData.get("stopReason"));
  const snoozeUntilIso = toOptionalIso(normalizeTextValue(formData.get("snoozeUntilIso")));
  const companyStatus = normalizePipelineStage(normalizeTextValue(formData.get("companyStatus")));

  if (!leadId) {
    throw new Error("Lead mangler ID.");
  }
  if (!company) {
    throw new Error("Bedrift mangler for CRM-oppdatering.");
  }
  if (!companyStatus) {
    throw new Error("Velg en gyldig pipeline-status.");
  }

  await syncLeadToGoogleSheet({
    leadId,
    updates: {
      leadStatus,
      stopReason,
      snoozeUntilIso,
    },
  });

  await syncCompanyEventToGoogleSheet({
    company,
    eventName,
    updates: {
      companyStatus,
    },
  });

  revalidatePath("/admin/crm");
}
