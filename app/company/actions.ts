"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { TableUpdate } from "@/lib/types/database";
import {
  companyBrandingSchema,
  companyEventGoalsSchema,
  companyEventSignupSchema,
  companyInfoSchema,
  companyOpportunitySchema,
  companyRecruitmentSchema,
} from "@/lib/validation/company";
import {
  getCompanyAttendeeTicketAllowance,
  hasJobPublishingAccessForRegistration,
  getOrCreateCompanyForUser,
  hasThesisPublishingAccessForRegistration,
} from "@/lib/company";
import { normalizeStudyCategories } from "@/lib/company-categories";
import { sendTransactionalEmail } from "@/lib/resend";

function isNextRedirectError(error: unknown) {
  const digest = (error as { digest?: string })?.digest;
  const message = (error as { message?: string })?.message;
  return digest === "NEXT_REDIRECT" || message === "NEXT_REDIRECT";
}

function generateTicketNumber() {
  return `T-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

async function ensureCapacity(supabase: ReturnType<typeof createAdminSupabaseClient>, eventId: string) {
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, ticket_limit")
    .eq("id", eventId)
    .single();
  if (eventError) throw eventError;
  if (!event?.ticket_limit) return;

  const { count, error: countError } = await supabase
    .from("event_tickets")
    .select("id, event_id", { count: "exact", head: true })
    .eq("event_id" as never, eventId as never);
  if (countError) throw countError;

  if ((count ?? 0) >= event.ticket_limit) {
    throw new Error("Det er ikke flere billetter igjen for dette eventet.");
  }
}

async function createTicketNumber(supabase: ReturnType<typeof createAdminSupabaseClient>, eventId: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const ticketNumber = generateTicketNumber();
    const { data, error } = await supabase
      .from("event_tickets")
      .insert({
        event_id: eventId,
        ticket_number: ticketNumber,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (!error) return data;
    if (error.code !== "23505") throw error;
  }
  throw new Error("Kunne ikke generere billettnummer.");
}

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
  if (!company) {
    throw new Error("Bedriftskontoen er ikke godkjent ennå.");
  }
  return { supabase, user, company };
}

function getCompanyActionMessage(error: unknown) {
  return error instanceof Error ? error.message : "Noe gikk galt.";
}

async function ensureOpportunityAccess(companyId: string, opportunityType: "job" | "thesis") {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("event_companies")
    .select("package, can_publish_jobs, can_publish_thesis")
    .eq("company_id", companyId);

  if (error) throw error;
  const registrations = (data ?? []) as Array<{
    package: string | null;
    can_publish_jobs?: boolean | null;
    can_publish_thesis?: boolean | null;
  }>;
  const hasAccess =
    opportunityType === "job"
      ? registrations.some((registration) => hasJobPublishingAccessForRegistration(registration))
      : registrations.some((registration) => hasThesisPublishingAccessForRegistration(registration));

  if (!hasAccess) {
    throw new Error(
      "Publisering er inkludert for Gull og Platinum. For Silver og Standard kan dette kjøpes som tillegg. Kontakt stian@oslostudenthub.no.",
    );
  }
}

export async function saveCompanyInfo(formData: FormData) {
  const parsed = companyInfoSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    orgNumber: String(formData.get("orgNumber") ?? ""),
    industry: String(formData.get("industry") ?? ""),
    industryCategories: formData.getAll("industryCategories"),
    size: String(formData.get("size") ?? ""),
    address: String(formData.get("address") ?? ""),
    postalCode: String(formData.get("postalCode") ?? ""),
    city: String(formData.get("city") ?? ""),
    country: String(formData.get("country") ?? ""),
    website: String(formData.get("website") ?? ""),
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join(", ");
    redirect(`/company/onboarding?error=${encodeURIComponent(message)}`);
  }

  const { supabase, company } = await getCompanyContext();
  const now = new Date().toISOString();

  const selectedCategories = normalizeStudyCategories(parsed.data.industryCategories ?? []);
  const primaryIndustry = selectedCategories[0] ?? parsed.data.industry ?? null;
  const location = [parsed.data.city, parsed.data.country]
    .map((value) => (value ?? "").trim())
    .filter(Boolean)
    .join(", ");
  const companyUpdate: TableUpdate<"companies"> = {
    name: parsed.data.name,
    org_number: parsed.data.orgNumber || null,
    industry: primaryIndustry || null,
    recruitment_fields: selectedCategories,
    size: parsed.data.size || null,
    address: parsed.data.address || null,
    postal_code: parsed.data.postalCode || null,
    city: parsed.data.city || null,
    country: parsed.data.country || null,
    location: location || null,
    website: parsed.data.website ? parsed.data.website : null,
    updated_at: now,
  };

  const { error } = await supabase
    .from("companies")
    .update(companyUpdate)
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
    recruitmentRoles: formData.getAll("recruitmentRoles"),
    recruitmentFields: formData.getAll("recruitmentFields"),
    recruitmentLevels: formData.getAll("recruitmentLevels"),
    recruitmentYearsBachelor: formData.getAll("recruitmentYearsBachelor"),
    recruitmentYearsMaster: formData.getAll("recruitmentYearsMaster"),
    recruitmentJobTypes: formData.getAll("recruitmentJobTypes"),
    recruitmentTiming: formData.getAll("recruitmentTiming"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  const { supabase, company } = await getCompanyContext();
  const now = new Date().toISOString();
  const normalizedRecruitmentFields = normalizeStudyCategories(parsed.data.recruitmentFields);

  const { error } = await supabase
    .from("companies")
    .update({
      recruitment_roles: parsed.data.recruitmentRoles,
      recruitment_fields: normalizedRecruitmentFields,
      recruitment_levels: parsed.data.recruitmentLevels,
      recruitment_years_bachelor: parsed.data.recruitmentYearsBachelor,
      recruitment_years_master: parsed.data.recruitmentYearsMaster,
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
    workStyle: formData.get("workStyle"),
    socialProfile: formData.get("socialProfile"),
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
      work_style: parsed.data.workStyle || null,
      social_profile: parsed.data.socialProfile || null,
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

export async function saveCompanyOpportunity(formData: FormData) {
  const opportunityType = String(formData.get("opportunityType") ?? "") === "thesis" ? "thesis" : "job";
  try {
    const parsed = companyOpportunitySchema.safeParse({
      id: String(formData.get("id") ?? ""),
      opportunityType,
      title: String(formData.get("title") ?? ""),
      location: String(formData.get("location") ?? ""),
      applicationUrl: String(formData.get("applicationUrl") ?? ""),
      applicationDeadline: String(formData.get("applicationDeadline") ?? ""),
      fieldTags: formData.getAll("fieldTags"),
      levels: formData.getAll("levels"),
      yearsBachelor: formData.getAll("yearsBachelor"),
      yearsMaster: formData.getAll("yearsMaster"),
      engagementTypes: formData.getAll("engagementTypes"),
      description: String(formData.get("description") ?? ""),
      isPublished: formData.get("isPublished") !== null,
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
    }

    const { company } = await getCompanyContext();
    await ensureOpportunityAccess(company.id, parsed.data.opportunityType);

    const supabase = createAdminSupabaseClient();
    const now = new Date().toISOString();
    const payload = {
      company_id: company.id,
      opportunity_type: parsed.data.opportunityType,
      title: parsed.data.title,
      location: parsed.data.location,
      application_url: parsed.data.applicationUrl || null,
      application_deadline: parsed.data.applicationDeadline,
      field_tags: parsed.data.fieldTags,
      levels: parsed.data.levels,
      years_bachelor: parsed.data.levels.includes("Bachelor") ? parsed.data.yearsBachelor : [],
      years_master: parsed.data.levels.includes("Master") ? parsed.data.yearsMaster : [],
      engagement_types: parsed.data.opportunityType === "job" ? parsed.data.engagementTypes : [],
      description: parsed.data.description || null,
      is_published: parsed.data.isPublished,
      updated_at: now,
    };

    if (parsed.data.id) {
      const { error } = await supabase
        .from("company_opportunities")
        .update(payload)
        .eq("id", parsed.data.id)
        .eq("company_id", company.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("company_opportunities").insert({
        ...payload,
        created_at: now,
      });
      if (error) throw error;
    }

    revalidatePath("/company/jobs");
    revalidatePath("/company/thesis-projects");
    revalidatePath("/jobs");
    revalidatePath("/thesis-projects");
    redirect(
      `/company/${parsed.data.opportunityType === "job" ? "jobs" : "thesis-projects"}?saved=1`,
    );
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    const message = getCompanyActionMessage(error);
    redirect(
      `/company/${opportunityType === "job" ? "jobs" : "thesis-projects"}?error=${encodeURIComponent(message)}`,
    );
  }
}

export async function deleteCompanyOpportunity(formData: FormData) {
  const opportunityType = String(formData.get("opportunityType") ?? "") === "thesis" ? "thesis" : "job";
  try {
    const id = String(formData.get("id") ?? "").trim();
    const { company } = await getCompanyContext();
    await ensureOpportunityAccess(company.id, opportunityType);

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from("company_opportunities")
      .delete()
      .eq("id", id)
      .eq("company_id", company.id);

    if (error) throw error;

    revalidatePath("/company/jobs");
    revalidatePath("/company/thesis-projects");
    revalidatePath("/jobs");
    revalidatePath("/thesis-projects");
    redirect(`/company/${opportunityType === "job" ? "jobs" : "thesis-projects"}?saved=1`);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    const message = getCompanyActionMessage(error);
    redirect(
      `/company/${opportunityType === "job" ? "jobs" : "thesis-projects"}?error=${encodeURIComponent(message)}`,
    );
  }
}

export async function updateCompanyEventGoals(formData: FormData) {
  const parsed = companyEventGoalsSchema.safeParse({
    eventId: formData.get("eventId"),
    goals: formData.getAll("goals"),
    kpis: formData.getAll("kpis"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  const { supabase, company } = await getCompanyContext();

  const { error } = await supabase
    .from("event_companies")
    .update({
      goals: parsed.data.goals,
      kpis: parsed.data.kpis,
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", parsed.data.eventId)
    .eq("company_id", company.id);

  if (error) throw error;
  revalidatePath("/company/events");
  revalidatePath("/company/roi");
}

export async function registerCompanyAttendee(formData: FormData) {
  const profile = await requireRole("company");
  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");

  const company = await getOrCreateCompanyForUser(profile.id, user.email);
  if (!company) throw new Error("Bedriftskontoen er ikke godkjent ennå.");

  const eventId = String(formData.get("eventId") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!eventId || !fullName || !email) {
    throw new Error("Navn og e-post er påkrevd.");
  }

  const { data: registration, error: registrationError } = await admin
    .from("event_companies")
    .select("package, extra_attendee_tickets")
    .eq("event_id", eventId)
    .eq("company_id", company.id)
    .maybeSingle();

  if (registrationError) throw registrationError;
  if (!registration) {
    throw new Error("Bedriften er ikke registrert på dette eventet.");
  }

  const attendeeLimit = getCompanyAttendeeTicketAllowance(registration);
  const { count: attendeeCount, error: attendeeCountError } = await admin
    .from("event_tickets")
    .select("id, event_id, company_id", { count: "exact", head: true })
    .eq("event_id" as never, eventId as never)
    .eq("company_id" as never, company.id as never);

  if (attendeeCountError) throw attendeeCountError;
  if ((attendeeCount ?? 0) >= attendeeLimit) {
    throw new Error(`Dere har nådd maks antall kostnadsfrie billetter (${attendeeLimit}) for denne pakken.`);
  }

  await ensureCapacity(admin, eventId);
  const ticket = await createTicketNumber(admin, eventId);
  const now = new Date().toISOString();

  const { error: attachError } = await admin
    .from("event_tickets")
    .update({
      company_id: company.id,
      attendee_name: fullName,
      attendee_email: email,
      attendee_phone: phone || null,
      updated_at: now,
    })
    .eq("id", ticket.id);

  if (attachError) throw attachError;

  const { data: event } = await admin.from("events").select("id, name").eq("id", eventId).single();
  const ticketPayload = encodeURIComponent(ticket.ticket_number);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${ticketPayload}`;

  await sendTransactionalEmail({
    to: email,
    subject: `Billett til ${event?.name ?? "OSH event"}`,
    type: "event_confirmation",
    html: `<p>Hei ${fullName},</p>
<p>Du er påmeldt ${event?.name ?? "eventet"} via ${company.name}.</p>
<p>Billettnummer: <strong>${ticket.ticket_number}</strong></p>
<p>Vis denne QR-koden i check-in:</p>
<p><img src="${qrUrl}" alt="QR-kode" /></p>`,
    payload: {
      eventId,
      ticketNumber: ticket.ticket_number,
      ticketId: ticket.id,
      companyId: company.id,
    },
    supabase: admin,
  });

  revalidatePath("/company/events");
}
