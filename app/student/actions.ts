"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { studentProfileSchema } from "@/lib/validation/student";
import { getOrCreateStudentForUser } from "@/lib/student";
import { createLead, upsertConsentForStudent } from "@/lib/lead";

export async function saveStudentProfile(formData: FormData) {
  const profile = await requireRole("student");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Du må være logget inn");
  }

  const student = await getOrCreateStudentForUser(profile.id, user.email);

  const parsed = studentProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    studyProgram: formData.get("studyProgram"),
    studyLevel: formData.get("studyLevel"),
    graduationYear: formData.get("graduationYear"),
    jobTypes: formData.get("jobTypes"),
    interests: formData.getAll("interests"),
    values: formData.get("values"),
    preferredLocations: formData.get("preferredLocations"),
    willingToRelocate: formData.get("willingToRelocate"),
    likedCompanyIds: formData.get("likedCompanyIds"),
    about: formData.get("about"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("students")
    .update({
      full_name: parsed.data.fullName,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone || null,
      study_program: parsed.data.studyProgram,
      study_level: parsed.data.studyLevel,
      graduation_year: parsed.data.graduationYear,
      job_types: parsed.data.jobTypes,
      interests: parsed.data.interests,
      values: parsed.data.values,
      preferred_locations: parsed.data.preferredLocations,
      willing_to_relocate: parsed.data.willingToRelocate,
      liked_company_ids: parsed.data.likedCompanyIds,
      about: parsed.data.about || null,
      updated_at: now,
    })
    .eq("id", student.id);

  if (error) throw error;

  if (parsed.data.likedCompanyIds.length > 0) {
    await Promise.all(
      parsed.data.likedCompanyIds.map(async (companyId) => {
        await upsertConsentForStudent({
          studentId: student.id,
          companyId,
          consentGiven: true,
          source: "student_portal",
        });
        await createLead({
          student: {
            ...student,
            full_name: parsed.data.fullName,
            email: parsed.data.email,
            phone: parsed.data.phone || null,
            study_program: parsed.data.studyProgram,
            study_level: parsed.data.studyLevel,
            graduation_year: parsed.data.graduationYear,
            job_types: parsed.data.jobTypes,
            interests: parsed.data.interests,
            values: parsed.data.values,
            preferred_locations: parsed.data.preferredLocations,
            willing_to_relocate: parsed.data.willingToRelocate,
            liked_company_ids: parsed.data.likedCompanyIds,
            about: parsed.data.about || null,
          },
          companyId,
          eventId: null,
          interests: parsed.data.interests,
          jobTypes: parsed.data.jobTypes,
          studyLevel: parsed.data.studyLevel,
          studyYear: parsed.data.graduationYear,
          fieldOfStudy: parsed.data.studyProgram,
          consentGiven: true,
          source: "student_portal",
        });
      }),
    );
  }

  revalidatePath("/student");
  revalidatePath("/student/consents");

  redirect("/student?saved=1");
}
