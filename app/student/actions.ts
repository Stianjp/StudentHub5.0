"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { studentProfileSchema } from "@/lib/validation/student";
import { getOrCreateStudentForUser } from "@/lib/student";
import { createLead, upsertConsentForStudent } from "@/lib/lead";

function parseMultiValue(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => String(value).trim())
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

async function syncFavoriteConsentAndLeads({
  student,
  previousLikedCompanyIds,
  nextLikedCompanyIds,
}: {
  student: Awaited<ReturnType<typeof getOrCreateStudentForUser>>;
  previousLikedCompanyIds: string[];
  nextLikedCompanyIds: string[];
}) {
  const uniqueNextLikedCompanyIds = Array.from(new Set(nextLikedCompanyIds));
  const nextSet = new Set(uniqueNextLikedCompanyIds);
  const removedCompanyIds = previousLikedCompanyIds.filter((companyId) => !nextSet.has(companyId));

  await Promise.all([
    ...uniqueNextLikedCompanyIds.map(async (companyId) => {
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
    ...removedCompanyIds.map(async (companyId) => {
      await upsertConsentForStudent({
        studentId: student.id,
        companyId,
        consentGiven: false,
        source: "student_portal",
      });
    }),
  ]);
}

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
  const previousLikedCompanyIds = student.liked_company_ids ?? [];

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
    interests: parseMultiValue(formData, "interests"),
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

  await syncFavoriteConsentAndLeads({
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
    previousLikedCompanyIds,
    nextLikedCompanyIds: parsed.data.likedCompanyIds,
  });

  revalidatePath("/student");
  revalidatePath("/student/consents");
  revalidatePath("/company/leads");
  revalidatePath("/company/roi");

  redirect("/student?saved=1");
}

export async function saveLikedCompanies(formData: FormData) {
  const profile = await requireRole("student");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Du må være logget inn");
  }

  const student = await getOrCreateStudentForUser(profile.id, user.email);
  const likedCompanyIds = Array.from(new Set(parseMultiValue(formData, "likedCompanyIds")));
  const previousLikedCompanyIds = student.liked_company_ids ?? [];

  const { error } = await supabase
    .from("students")
    .update({
      liked_company_ids: likedCompanyIds,
      updated_at: new Date().toISOString(),
    })
    .eq("id", student.id);

  if (error) throw error;

  await syncFavoriteConsentAndLeads({
    student: {
      ...student,
      liked_company_ids: previousLikedCompanyIds,
    },
    previousLikedCompanyIds,
    nextLikedCompanyIds: likedCompanyIds,
  });

  revalidatePath("/student");
  revalidatePath("/student/dashboard");
  revalidatePath("/student/companies");
  revalidatePath("/student/consents");
  revalidatePath("/company/leads");
  revalidatePath("/company/roi");

  redirect("/student/companies?saved=1");
}
