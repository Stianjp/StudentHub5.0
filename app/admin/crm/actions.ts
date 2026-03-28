"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { normalizePipelineStage } from "@/lib/crm";
import {
  deleteCrmEntriesForCompanyEvent,
  updateCrmLeadFields,
  updateCompanyPipelineStage,
  upsertCrmEntry,
} from "@/lib/crm-supabase";

function isNextRedirectError(error: unknown) {
  const digest = (error as { digest?: string })?.digest;
  const message = (error as { message?: string })?.message;
  return digest === "NEXT_REDIRECT" || message === "NEXT_REDIRECT";
}

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

  if (!company) throw new Error("Bedrift mangler for pipeline-oppdatering.");
  if (!companyStatus) throw new Error("Velg en gyldig pipeline-status.");

  await updateCompanyPipelineStage(company, eventName, companyStatus);
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

  if (!leadId) throw new Error("Lead mangler ID.");
  if (!company) throw new Error("Bedrift mangler for CRM-oppdatering.");
  if (!companyStatus) throw new Error("Velg en gyldig pipeline-status.");

  await updateCrmLeadFields(leadId, { leadStatus, stopReason, snoozeUntilIso, companyStatus });
  await updateCompanyPipelineStage(company, eventName, companyStatus);
  revalidatePath("/admin/crm");
}

export async function createCrmEntry(formData: FormData) {
  await requireRole("admin");

  const company = normalizeTextValue(formData.get("company"));
  const contactName = normalizeTextValue(formData.get("contactName"));
  const contactEmail = normalizeTextValue(formData.get("contactEmail"));
  const subject = normalizeTextValue(formData.get("subject"));
  const eventName = normalizeTextValue(formData.get("eventName"));

  if (!company) throw new Error("Bedrift er påkrevd.");

  await upsertCrmEntry({
    leadId: crypto.randomUUID(),
    company,
    contactName,
    contactEmail,
    subject,
    eventName,
    leadStatus: "waiting",
    companyStatus: "Kontaktet",
  });

  revalidatePath("/admin/crm");
}

export async function deleteCrmCompanyEntries(formData: FormData) {
  await requireRole("admin");

  const company = normalizeTextValue(formData.get("company"));
  const eventName = normalizeTextValue(formData.get("eventName"));
  const returnTo = normalizeTextValue(formData.get("returnTo")) || "/admin/crm";

  if (!company) {
    throw new Error("Bedrift mangler for CRM-sletting.");
  }

  const separator = returnTo.includes("?") ? "&" : "?";

  try {
    const deletedCount = await deleteCrmEntriesForCompanyEvent(company, eventName);
    revalidatePath("/admin/crm");
    redirect(`${returnTo}${separator}deleted=${deletedCount}`);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Kunne ikke slette CRM-oppføringen.";
    redirect(`${returnTo}${separator}error=${encodeURIComponent(message)}`);
  }
}
