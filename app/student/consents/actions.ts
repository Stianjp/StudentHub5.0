"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser } from "@/lib/student";
import { createLead, upsertConsentForStudent } from "@/lib/lead";

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
