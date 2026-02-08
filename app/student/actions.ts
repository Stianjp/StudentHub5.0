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

  const studyTrack = String(formData.get("studyTrack") ?? "").trim();
  const trackMatch = studyTrack.match(/^(Bachelor|Master)-(\d)$/);
  const studyLevel = trackMatch?.[1] ?? "";
  const studyYear = trackMatch ? Number(trackMatch[2]) : NaN;

  const parsed = studentProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    studyProgram: formData.get("studyProgram"),
    studyLevel,
    studyYear,
    jobTypes: formData.get("jobTypes") ?? undefined,
    interests: formData.getAll("interests"),
    values: formData.get("values"),
    preferredLocations: formData.get("preferredLocations") ?? undefined,
    willingToRelocate: formData.get("willingToRelocate"),
    likedCompanyIds: formData.get("likedCompanyIds") ?? undefined,
    about: formData.get("about"),
    workStyle: formData.get("workStyle"),
    socialProfile: formData.get("socialProfile"),
    teamSize: formData.get("teamSize"),
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
      study_year: parsed.data.studyYear,
      job_types: parsed.data.jobTypes,
      interests: parsed.data.interests,
      values: parsed.data.values,
      preferred_locations: parsed.data.preferredLocations,
      willing_to_relocate: parsed.data.willingToRelocate,
      liked_company_ids: parsed.data.likedCompanyIds,
      about: parsed.data.about || null,
      work_style: parsed.data.workStyle || null,
      social_profile: parsed.data.socialProfile || null,
      team_size: parsed.data.teamSize || null,
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
            study_year: parsed.data.studyYear,
            job_types: parsed.data.jobTypes,
            interests: parsed.data.interests,
            values: parsed.data.values,
            preferred_locations: parsed.data.preferredLocations,
            willing_to_relocate: parsed.data.willingToRelocate,
            liked_company_ids: parsed.data.likedCompanyIds,
            about: parsed.data.about || null,
            work_style: parsed.data.workStyle || null,
            social_profile: parsed.data.socialProfile || null,
            team_size: parsed.data.teamSize || null,
          },
          companyId,
          eventId: null,
          interests: parsed.data.interests,
          jobTypes: parsed.data.jobTypes,
          studyLevel: parsed.data.studyLevel,
          studyYear: parsed.data.studyYear,
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
