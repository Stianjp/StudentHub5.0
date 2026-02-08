"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
  const studyYear = graduationYearRaw ? Number(graduationYearRaw) : null;

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("students")
    .update({
      full_name: fullName || null,
      email: email || null,
      study_program: studyProgram || null,
      study_level: studyLevel || null,
      study_year: Number.isNaN(studyYear) ? null : studyYear,
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
        study_year: Number.isNaN(studyYear) ? null : studyYear,
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

  if (!studentId || !companyId) {
    throw new Error("Student og bedrift må være valgt.");
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
  };

  const { error } = await supabase
    .from("consents")
    .upsert(payload, { onConflict: "student_id,company_id" });

  if (error?.code === "PGRST204" || error?.message?.includes("updated_at")) {
    const fallback = { ...payload };
    delete (fallback as { updated_at?: string }).updated_at;
    const { error: fallbackError } = await supabase
      .from("consents")
      .upsert(fallback, { onConflict: "student_id,company_id" });
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

export async function deleteStudent(formData: FormData) {
  await requireRole("admin");
  const sessionClient = await createServerSupabaseClient();
  const {
    data: { user: currentUser },
  } = await sessionClient.auth.getUser();
  const studentId = String(formData.get("studentId") ?? "").trim();
  if (!studentId) throw new Error("Ugyldig student.");

  const supabase = createAdminSupabaseClient();

  const { data: student } = await supabase
    .from("students")
    .select("id, user_id")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) throw new Error("Student finnes ikke.");
  if (currentUser?.id && student.user_id === currentUser.id) {
    throw new Error("Du kan ikke slette brukeren du er logget inn som.");
  }

  // Clean up related rows first.
  await supabase.from("consents").delete().eq("student_id", studentId);
  await supabase.from("leads").delete().eq("student_id", studentId);
  await supabase.from("stand_visits").delete().eq("student_id", studentId);
  await supabase.from("survey_responses").delete().eq("student_id", studentId);
  await supabase.from("student_company_favorites").delete().eq("student_id", studentId);
  await supabase.from("match_scores").delete().eq("student_id", studentId);
  await supabase.from("student_public_profiles").delete().eq("student_id", studentId);

  const { error: deleteError } = await supabase.from("students").delete().eq("id", studentId);
  if (deleteError) throw deleteError;

  if (student.user_id) {
    try {
      await supabase.auth.admin.deleteUser(student.user_id);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "user_not_found") {
        throw error;
      }
    }
  }

  revalidatePath("/admin/students");
  revalidatePath("/admin/leads");
  redirect("/admin/students?saved=1");
}
