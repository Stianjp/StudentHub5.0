"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { consentSchema, kioskSurveySchema } from "@/lib/validation/student";
import {
  getOrCreateStudentForUser,
  recordStandVisit,
  submitKioskSurvey,
} from "@/lib/student";
import { createLead, upsertConsentForStudent } from "@/lib/lead";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function submitStandFlow(formData: FormData) {
  const profile = await requireRole("student");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");

  const student = await getOrCreateStudentForUser(profile.id, user.email);

  const parsed = consentSchema.safeParse({
    eventId: formData.get("eventId"),
    companyId: formData.get("companyId"),
    consent: formData.get("consent"),
    scope: formData.get("scope") ?? "contact",
    answers: {
      motivation: formData.get("motivation")?.toString(),
      timing: formData.get("timing")?.toString(),
      skills: formData.get("skills")?.toString(),
    },
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  if (!parsed.data.eventId) {
    throw new Error("Event mangler.");
  }

  await recordStandVisit({
    eventId: parsed.data.eventId,
    companyId: parsed.data.companyId,
    studentId: student.id,
    source: "qr",
    metadata: { flow: "stand" },
  });

  await upsertConsentForStudent({
    studentId: student.id,
    companyId: parsed.data.companyId,
    eventId: parsed.data.eventId ?? null,
    consentGiven: parsed.data.consent,
    source: "stand",
  });

  await createLead({
    student,
    companyId: parsed.data.companyId,
    eventId: parsed.data.eventId ?? null,
    interests: Object.values(parsed.data.answers ?? {}).filter(Boolean) as string[],
    jobTypes: student.job_types ?? [],
    studyLevel: student.study_level,
    studyYear: student.graduation_year,
    fieldOfStudy: student.study_program,
    consentGiven: parsed.data.consent,
    source: "stand",
  });

  if (parsed.data.answers && Object.keys(parsed.data.answers).length > 0) {
    const supabase = await createServerSupabaseClient();
    await supabase.from("survey_responses").insert({
      event_id: parsed.data.eventId,
      company_id: parsed.data.companyId,
      student_id: student.id,
      answers: parsed.data.answers,
      created_at: new Date().toISOString(),
    });
  }

  revalidatePath(`/event/${parsed.data.eventId}/company/${parsed.data.companyId}`);
  revalidatePath("/student/consents");
}

export async function submitKiosk(formData: FormData) {
  const parsed = kioskSurveySchema.safeParse({
    eventId: formData.get("eventId"),
    studyProgram: formData.get("studyProgram"),
    studyLevel: formData.get("studyLevel"),
    jobTypes: formData.get("jobTypes"),
    interests: formData.get("interests"),
    values: formData.get("values"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  await submitKioskSurvey({
    eventId: parsed.data.eventId,
    answers: {
      studyProgram: parsed.data.studyProgram,
      studyLevel: parsed.data.studyLevel,
      jobTypes: parsed.data.jobTypes,
      interests: parsed.data.interests,
      values: parsed.data.values,
    },
  });

  await recordStandVisit({
    eventId: parsed.data.eventId,
    companyId: formData.get("companyId")?.toString() ?? null,
    studentId: null,
    source: "kiosk",
    metadata: { flow: "kiosk" },
  });

  revalidatePath(`/event/${parsed.data.eventId}/kiosk`);
}
