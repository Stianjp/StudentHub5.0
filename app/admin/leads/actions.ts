"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function upsertConsent(formData: FormData) {
  const profile = await requireRole("admin");
  const eventId = String(formData.get("eventId") ?? "");
  const companyId = String(formData.get("companyId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const consent = String(formData.get("consent") ?? "true") === "true";

  if (!eventId || !companyId || !studentId) {
    throw new Error("Event, bedrift og student må være valgt.");
  }

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("consents")
    .upsert(
      {
        event_id: eventId,
        company_id: companyId,
        student_id: studentId,
        consent,
        scope: "contact",
        consented_at: now,
        created_at: now,
        updated_at: now,
        updated_by: profile.id,
      },
      { onConflict: "event_id,company_id,student_id" },
    );

  if (error) throw error;

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

  if (error) throw error;

  revalidatePath("/admin/leads");
}
