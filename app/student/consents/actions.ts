"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser } from "@/lib/student";
import { createLead, upsertConsentForStudent } from "@/lib/lead";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function getFormValue(formData: FormData, name: string) {
  const direct = formData.get(name);
  if (direct !== null) return String(direct);

  for (const [key, value] of formData.entries()) {
    if (key === name) continue;
    if (key.endsWith(`_${name}`) || key.endsWith(name)) {
      return String(value);
    }
  }

  return "";
}

export async function giveConsentToCompany(formData: FormData) {
  await requireRole("student");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");

  const student = await getOrCreateStudentForUser(user.id, user.email);
  const companyId = getFormValue(formData, "companyId");

  if (!companyId) {
    throw new Error("Bedrift må være valgt.");
  }

  await upsertConsentForStudent({
    studentId: student.id,
    companyId,
    consentGiven: true,
    source: "student_portal",
  });

  await createLead({
    student,
    companyId,
    eventId: null,
    interests: student.interests ?? [],
    jobTypes: student.job_types ?? [],
    studyLevel: student.study_level,
    studyYear: student.study_year ?? student.graduation_year,
    fieldOfStudy: student.study_program,
    consentGiven: true,
    source: "student_portal",
  });
  revalidatePath("/student/consents");
}

export async function withdrawConsent(formData: FormData) {
  await requireRole("student");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");

  const student = await getOrCreateStudentForUser(user.id, user.email);
  const companyId = getFormValue(formData, "companyId");

  if (!companyId) {
    throw new Error("Bedrift må være valgt.");
  }

  await upsertConsentForStudent({
    studentId: student.id,
    companyId,
    consentGiven: false,
    source: "student_portal",
  });
  revalidatePath("/student/consents");
}

export async function giveConsentToAll(formData: FormData) {
  await requireRole("student");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");

  const student = await getOrCreateStudentForUser(user.id, user.email);
  const industry = getFormValue(formData, "industry");

  const query = supabase.from("companies").select("id");
  const { data: companies, error: companiesError } = industry
    ? await query.eq("industry", industry)
    : await query;

  if (companiesError) throw companiesError;
  const companyIds = (companies ?? []).map((company) => company.id);

  if (companyIds.length === 0) return;

  await Promise.all(
    companyIds.map(async (companyId) => {
      await upsertConsentForStudent({
        studentId: student.id,
        companyId,
        consentGiven: true,
        source: "student_portal",
      });
      await createLead({
        student,
        companyId,
        eventId: null,
        interests: student.interests ?? [],
        jobTypes: student.job_types ?? [],
        studyLevel: student.study_level,
        studyYear: student.study_year ?? student.graduation_year,
        fieldOfStudy: student.study_program,
        consentGiven: true,
        source: "student_portal",
      });
    }),
  );
  revalidatePath("/student/consents");
}

export async function changeStudentPassword(formData: FormData) {
  await requireRole("student");
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not found");
  }

  const password = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    redirect(`/student/consents?accountError=${encodeURIComponent("Passord må være minst 8 tegn.")}`);
  }
  if (password !== confirmPassword) {
    redirect(`/student/consents?accountError=${encodeURIComponent("Passordene er ikke like.")}`);
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/student/consents?accountError=${encodeURIComponent("Kunne ikke endre passord akkurat nå.")}`);
  }

  revalidatePath("/student/consents");
  redirect("/student/consents?passwordUpdated=1");
}

export async function deleteStudentAccount(formData: FormData) {
  await requireRole("student");
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not found");
  }

  const confirmDelete = String(formData.get("confirmDelete") ?? "").trim().toUpperCase();
  if (confirmDelete !== "SLETT") {
    redirect(`/student/consents?accountError=${encodeURIComponent("Skriv SLETT for å bekrefte sletting.")}`);
  }

  let admin;
  try {
    admin = createAdminSupabaseClient();
  } catch {
    redirect(
      `/student/consents?accountError=${encodeURIComponent("Sletting er midlertidig utilgjengelig. Kontakt support.")}`,
    );
  }

  const { error: studentsError } = await admin.from("students").delete().eq("user_id", user.id);
  if (studentsError) {
    throw studentsError;
  }

  const { error: profileError } = await admin.from("profiles").delete().eq("id", user.id);
  if (profileError) {
    throw profileError;
  }

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(user.id);
  if (authDeleteError) {
    throw authDeleteError;
  }

  await supabase.auth.signOut();
  redirect("/auth/sign-in?role=student&deleted=1");
}
