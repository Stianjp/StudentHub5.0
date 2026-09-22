"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { resolveOAuthPortalRole } from "@/lib/auth-oauth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { companyOAuthOnboardingSchema, studentOAuthOnboardingSchema } from "@/lib/validation/auth";
import { ensureCompanyAccessRequest, uploadCompanyLogo } from "@/lib/company-access";

async function getAuthenticatedPortalUser(expectedRole: "student" | "company") {
  const host = (await headers()).get("host");
  const role = resolveOAuthPortalRole(host, expectedRole);
  if (role !== expectedRole) {
    redirect(`/auth/sign-in?role=${expectedRole}&reason=wrong-portal`);
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    redirect(`/auth/sign-in?role=${expectedRole}`);
  }

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== expectedRole) {
    await supabase.auth.signOut();
    redirect(`/auth/sign-in?role=${expectedRole}&reason=wrong-portal`);
  }

  return { user, admin };
}

export async function completeStudentOAuthOnboarding(formData: FormData) {
  const parsed = studentOAuthOnboardingSchema.safeParse({
    fullName: formData.get("fullName"),
    school: formData.get("school"),
    studyProgram: formData.get("studyProgram"),
    studyLevel: formData.get("studyLevel"),
    studyYear: formData.get("studyYear"),
    jobTypes: formData.getAll("jobTypes"),
  });
  if (!parsed.success) {
    redirect(`/auth/onboarding/student?error=${encodeURIComponent(parsed.error.issues.map((issue) => issue.message).join(" "))}`);
  }

  const { user, admin } = await getAuthenticatedPortalUser("student");
  const email = user.email!.trim().toLowerCase();
  const now = new Date().toISOString();

  const { data: byUser } = await admin
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: byEmail } = byUser
    ? { data: null }
    : await admin
        .from("students")
        .select("id, user_id")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  const studentPayload = {
    user_id: user.id,
    email,
    full_name: parsed.data.fullName,
    school: parsed.data.school,
    study_program: parsed.data.studyProgram,
    study_level: parsed.data.studyLevel,
    study_year: parsed.data.studyYear,
    job_types: parsed.data.jobTypes,
    updated_at: now,
  };

  let error: { message: string } | null = null;
  if (byUser?.id) {
    ({ error } = await admin.from("students").update(studentPayload).eq("id", byUser.id));
  } else if (byEmail?.id && (!byEmail.user_id || byEmail.user_id === user.id)) {
    ({ error } = await admin.from("students").update(studentPayload).eq("id", byEmail.id));
  } else {
    ({ error } = await admin.from("students").insert({
      ...studentPayload,
      created_at: now,
      interests: [],
      values: [],
      preferred_locations: [],
      willing_to_relocate: false,
      liked_company_ids: [],
    }));
  }
  if (error) {
    redirect(`/auth/onboarding/student?error=${encodeURIComponent(error.message)}`);
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ full_name: parsed.data.fullName, updated_at: now })
    .eq("id", user.id);
  if (profileError) {
    redirect(`/auth/onboarding/student?error=${encodeURIComponent(profileError.message)}`);
  }

  revalidatePath("/student");
  redirect("/student/dashboard");
}

export async function completeCompanyOAuthOnboarding(formData: FormData) {
  const parsed = companyOAuthOnboardingSchema.safeParse({
    companyName: formData.get("companyName"),
    orgNumber: String(formData.get("orgNumber") ?? "").replace(/\s+/g, ""),
    address: formData.get("address"),
    postalCode: formData.get("postalCode"),
    city: formData.get("city"),
    country: formData.get("country"),
    recruitmentFields: formData.getAll("recruitmentFields"),
  });
  if (!parsed.success) {
    redirect(`/auth/onboarding/company?error=${encodeURIComponent(parsed.error.issues.map((issue) => issue.message).join(" "))}`);
  }

  const { user, admin } = await getAuthenticatedPortalUser("company");
  const logo = formData.get("logo");
  let logoPath: string | null = null;

  if (logo instanceof File && logo.size > 0) {
    if (!logo.type.startsWith("image/") || logo.size > 6 * 1024 * 1024) {
      redirect("/auth/onboarding/company?error=Logo%20must%20be%20an%20image%20of%206%20MB%20or%20less.");
    }
    logoPath = await uploadCompanyLogo({ userId: user.id, file: logo, orgNumber: parsed.data.orgNumber });
  }

  try {
    await ensureCompanyAccessRequest({
      userId: user.id,
      email: user.email!,
      orgNumber: parsed.data.orgNumber,
      companyName: parsed.data.companyName,
      address: parsed.data.address,
      postalCode: parsed.data.postalCode,
      city: parsed.data.city,
      country: parsed.data.country,
      logoPath,
      recruitmentFields: parsed.data.recruitmentFields,
    });
    const { error: profileError } = await admin
      .from("profiles")
      .update({ full_name: parsed.data.companyName, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (profileError) throw profileError;
  } catch (error) {
    if (logoPath) {
      await admin.storage.from("event-registration-assets").remove([logoPath]).catch(() => undefined);
    }
    const message = error instanceof Error ? error.message : "The access request could not be created.";
    redirect(`/auth/onboarding/company?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/company");
  redirect("/company");
}
