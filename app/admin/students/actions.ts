"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function parseTags(input: FormDataEntryValue | null) {
  if (!input) return [];
  return String(input)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function updateStudentProfile(formData: FormData) {
  await requireRole("admin");
  const studentId = String(formData.get("studentId") ?? "").trim();
  if (!studentId) throw new Error("Ugyldig student.");

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const studyProgram = String(formData.get("studyProgram") ?? "").trim();
  const studyLevel = String(formData.get("studyLevel") ?? "").trim();
  const graduationYearRaw = String(formData.get("graduationYear") ?? "").trim();
  const interests = parseTags(formData.get("interests"));
  const graduationYear = graduationYearRaw ? Number(graduationYearRaw) : null;

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("students")
    .update({
      full_name: fullName || null,
      email: email || null,
      study_program: studyProgram || null,
      study_level: studyLevel || null,
      graduation_year: Number.isNaN(graduationYear) ? null : graduationYear,
      interests,
      updated_at: now,
    })
    .eq("id", studentId);

  if (error) throw error;

  await supabase
    .from("student_public_profiles")
    .upsert(
      {
        student_id: studentId,
        study_program: studyProgram || null,
        study_level: studyLevel || null,
        graduation_year: Number.isNaN(graduationYear) ? null : graduationYear,
        interests,
        updated_at: now,
      },
      { onConflict: "student_id" },
    );

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${studentId}`);
}

export async function upsertStudentConsent(formData: FormData) {
  const profile = await requireRole("admin");
  const studentId = String(formData.get("studentId") ?? "").trim();
  const companyId = String(formData.get("companyId") ?? "").trim();
  const eventId = String(formData.get("eventId") ?? "").trim();
  const consent = String(formData.get("consent") ?? "true") === "true";

  if (!studentId || !companyId || !eventId) {
    throw new Error("Student, bedrift og event må være valgt.");
  }

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const payload = {
    event_id: eventId,
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
    .upsert(payload, { onConflict: "event_id,company_id,student_id" });

  if (error?.code === "PGRST204" || error?.message?.includes("updated_at")) {
    const fallback = { ...payload };
    delete (fallback as { updated_at?: string }).updated_at;
    delete (fallback as { updated_by?: string }).updated_by;
    const { error: fallbackError } = await supabase
      .from("consents")
      .upsert(fallback, { onConflict: "event_id,company_id,student_id" });
    if (fallbackError) throw fallbackError;
  } else if (error) {
    throw error;
  }

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/students/${studentId}`);
}

export async function updateStudentConsent(formData: FormData) {
  const profile = await requireRole("admin");
  const studentId = String(formData.get("studentId") ?? "").trim();
  const consentId = String(formData.get("consentId") ?? "").trim();
  const consent = String(formData.get("consent") ?? "true") === "true";

  if (!studentId || !consentId) throw new Error("Ugyldig samtykke.");

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
  revalidatePath(`/admin/students/${studentId}`);
}
