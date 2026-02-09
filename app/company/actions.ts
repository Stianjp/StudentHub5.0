"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  companyBrandingSchema,
  companyEventGoalsSchema,
  companyEventSignupSchema,
  companyInfoSchema,
  companyRecruitmentSchema,
} from "@/lib/validation/company";
import { getOrCreateCompanyForUser } from "@/lib/company";
import { sendTransactionalEmail } from "@/lib/resend";

function generateTicketNumber() {
  return `T-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

async function ensureCapacity(supabase: ReturnType<typeof createAdminSupabaseClient>, eventId: string) {
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("ticket_limit")
    .eq("id", eventId)
    .single();
  if (eventError) throw eventError;
  if (!event?.ticket_limit) return;

  const { count, error: countError } = await supabase
    .from("event_tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);
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

export async function saveCompanyInfo(formData: FormData) {
  const parsed = companyInfoSchema.safeParse({
    name: formData.get("name"),
    orgNumber: formData.get("orgNumber"),
    industry: formData.get("industry"),
    industryCategories: formData.getAll("industryCategories"),
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

  const selectedCategories = parsed.data.industryCategories ?? [];
  const primaryIndustry = selectedCategories[0] ?? parsed.data.industry ?? null;

  const { error } = await supabase
    .from("companies")
    .update({
      name: parsed.data.name,
      org_number: parsed.data.orgNumber || null,
      industry: primaryIndustry || null,
      recruitment_fields: selectedCategories,
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

  const { error } = await supabase
    .from("companies")
    .update({
      recruitment_roles: parsed.data.recruitmentRoles,
      recruitment_fields: parsed.data.recruitmentFields,
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
  const ticketPayload = encodeURIComponent(JSON.stringify({ t: ticket.ticket_number, e: eventId }));
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
