"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  companyBrandingSchema,
  companyEventSignupSchema,
  companyInfoSchema,
  companyRecruitmentSchema,
} from "@/lib/validation/company";
import { getOrCreateCompanyForUser } from "@/lib/company";
import { sendTransactionalEmail } from "@/lib/resend";

async function getCompanyContext() {
  const profile = await requireRole("company");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Du må være logget inn");
  }

  const company = await getOrCreateCompanyForUser(profile.id, user.email);
  return { supabase, user, company };
}

export async function saveCompanyInfo(formData: FormData) {
  const parsed = companyInfoSchema.safeParse({
    name: formData.get("name"),
    orgNumber: formData.get("orgNumber"),
    industry: formData.get("industry"),
    size: formData.get("size"),
    location: formData.get("location"),
    website: formData.get("website"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join(", ");
    redirect(`/company/onboarding?error=${encodeURIComponent(message)}`);
  }

  const { supabase, company } = await getCompanyContext();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("companies")
    .update({
      name: parsed.data.name,
      org_number: parsed.data.orgNumber || null,
      industry: parsed.data.industry || null,
      size: parsed.data.size || null,
      location: parsed.data.location || null,
      website: parsed.data.website ? parsed.data.website : null,
      updated_at: now,
    })
    .eq("id", company.id);

  if (error) throw error;
  revalidatePath("/company");
  const nextPath = formData.get("next");
  if (typeof nextPath === "string" && nextPath.startsWith("/")) {
    redirect(nextPath);
  }
}

export async function saveCompanyRecruitment(formData: FormData) {
  const parsed = companyRecruitmentSchema.safeParse({
    recruitmentRoles: formData.get("recruitmentRoles"),
    recruitmentFields: formData.get("recruitmentFields"),
    recruitmentLevels: formData.get("recruitmentLevels"),
    recruitmentJobTypes: formData.get("recruitmentJobTypes"),
    recruitmentTiming: formData.get("recruitmentTiming"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  const { supabase, company } = await getCompanyContext();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("companies")
    .update({
      recruitment_roles: parsed.data.recruitmentRoles,
      recruitment_fields: parsed.data.recruitmentFields,
      recruitment_levels: parsed.data.recruitmentLevels,
      recruitment_job_types: parsed.data.recruitmentJobTypes,
      recruitment_timing: parsed.data.recruitmentTiming,
      updated_at: now,
    })
    .eq("id", company.id);

  if (error) throw error;
  revalidatePath("/company");
  const nextPath = formData.get("next");
  if (typeof nextPath === "string" && nextPath.startsWith("/")) {
    redirect(nextPath);
  }
}

export async function saveCompanyBranding(formData: FormData) {
  const parsed = companyBrandingSchema.safeParse({
    brandingValues: formData.get("brandingValues"),
    brandingEvp: formData.get("brandingEvp"),
    brandingMessage: formData.get("brandingMessage"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  const { supabase, company } = await getCompanyContext();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("companies")
    .update({
      branding_values: parsed.data.brandingValues,
      branding_evp: parsed.data.brandingEvp || null,
      branding_message: parsed.data.brandingMessage || null,
      updated_at: now,
    })
    .eq("id", company.id);

  if (error) throw error;
  revalidatePath("/company");
  const nextPath = formData.get("next");
  if (typeof nextPath === "string" && nextPath.startsWith("/")) {
    redirect(nextPath);
  }
}

export async function signupForEvent(formData: FormData) {
  const parsed = companyEventSignupSchema.safeParse({
    eventId: formData.get("eventId"),
    standType: formData.get("standType"),
    goals: formData.get("goals"),
    kpis: formData.get("kpis"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  const { supabase, company, user } = await getCompanyContext();
  const now = new Date().toISOString();

  const { data: registration, error: upsertError } = await supabase
    .from("event_companies")
    .upsert(
      {
        event_id: parsed.data.eventId,
        company_id: company.id,
        stand_type: parsed.data.standType || null,
        goals: parsed.data.goals,
        kpis: parsed.data.kpis,
        registered_at: now,
        updated_at: now,
      },
      { onConflict: "event_id,company_id" },
    )
    .select("*")
    .single();

  if (upsertError) throw upsertError;

  const { data: event } = await supabase.from("events").select("*").eq("id", parsed.data.eventId).single();

  if (user.email) {
    await sendTransactionalEmail({
      to: user.email,
      subject: `Påmelding bekreftet: ${event?.name ?? "OSH event"}`,
      type: "event_confirmation",
      html: `<p>Hei ${company.name},</p>
<p>Påmeldingen til ${event?.name ?? "eventet"} er registrert.</p>
<p>Du kan se detaljer i bedriftsportalen.</p>`,
      payload: {
        eventId: parsed.data.eventId,
        companyId: company.id,
        registrationId: registration.id,
      },
      supabase,
    });
  }

  revalidatePath("/company/events");
  revalidatePath("/company");
}
