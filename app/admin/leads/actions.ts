"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function upsertConsent(formData: FormData) {
  const profile = await requireRole("admin");
  const eventId = String(formData.get("eventId") ?? "").trim();
  const companyId = String(formData.get("companyId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const consent = String(formData.get("consent") ?? "true") === "true";

  if (!companyId || !studentId) {
    throw new Error("Bedrift og student må være valgt.");
  }

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const payload = {
    event_id: eventId || null,
    company_id: companyId,
    student_id: studentId,
    consent,
    scope: "contact",
    consented_at: now,
    created_at: now,
    updated_at: now,
    updated_by: profile.id,
  };

  const { error } = await supabase
    .from("consents")
    .upsert(payload, { onConflict: "student_id,company_id" });

  if (error?.code === "PGRST204" || error?.message?.includes("updated_at")) {
    const fallback = { ...payload };
    delete (fallback as { updated_at?: string }).updated_at;
    delete (fallback as { updated_by?: string }).updated_by;
    const { error: fallbackError } = await supabase
      .from("consents")
      .upsert(fallback, { onConflict: "student_id,company_id" });
    if (fallbackError) throw fallbackError;
  } else if (error) {
    throw error;
  }

  revalidatePath("/admin/leads");
}

export async function updateConsent(formData: FormData) {
  const profile = await requireRole("admin");
  const consentId = String(formData.get("consentId") ?? "");
  const consent = String(formData.get("consent") ?? "true") === "true";

  if (!consentId) throw new Error("Ugyldig samtykke.");

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("consents")
    .update({
      consent,
      updated_at: now,
      updated_by: profile.id,
    })
    .eq("id", consentId);

  if (error?.code === "PGRST204" || error?.message?.includes("updated_at")) {
    const { error: fallbackError } = await supabase
      .from("consents")
      .update({ consent })
      .eq("id", consentId);
    if (fallbackError) throw fallbackError;
  } else if (error) {
    throw error;
  }

  revalidatePath("/admin/leads");
}
