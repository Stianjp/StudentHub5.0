"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser } from "@/lib/student";
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
  const eventId = getFormValue(formData, "eventId");
  const companyId = getFormValue(formData, "companyId");

  if (!eventId || !companyId) {
    throw new Error("Event og bedrift må være valgt.");
  }

  const now = new Date().toISOString();
  const adminSupabase = createAdminSupabaseClient();
  const payload = {
    event_id: eventId,
    company_id: companyId,
    student_id: student.id,
    consent: true,
    scope: "contact",
    consented_at: now,
    created_at: now,
    updated_at: now,
    updated_by: user.id,
  };

  const { error } = await adminSupabase
    .from("consents")
    .upsert(payload, { onConflict: "event_id,company_id,student_id" });

  if (error?.code === "PGRST204" || error?.message?.includes("updated_at")) {
    const fallback = { ...payload };
    delete (fallback as { updated_at?: string }).updated_at;
    delete (fallback as { updated_by?: string }).updated_by;
    const { error: fallbackError } = await adminSupabase
      .from("consents")
      .upsert(fallback, { onConflict: "event_id,company_id,student_id" });
    if (fallbackError) throw fallbackError;
  } else if (error) {
    throw error;
  }
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
  const eventId = getFormValue(formData, "eventId");
  const companyId = getFormValue(formData, "companyId");

  if (!eventId || !companyId) {
    throw new Error("Event og bedrift må være valgt.");
  }

  const now = new Date().toISOString();
  const adminSupabase = createAdminSupabaseClient();
  const payload = {
    event_id: eventId,
    company_id: companyId,
    student_id: student.id,
    consent: false,
    scope: "contact",
    consented_at: now,
    created_at: now,
    updated_at: now,
    updated_by: user.id,
  };

  const { error } = await adminSupabase
    .from("consents")
    .upsert(payload, { onConflict: "event_id,company_id,student_id" });

  if (error?.code === "PGRST204" || error?.message?.includes("updated_at")) {
    const fallback = { ...payload };
    delete (fallback as { updated_at?: string }).updated_at;
    delete (fallback as { updated_by?: string }).updated_by;
    const { error: fallbackError } = await adminSupabase
      .from("consents")
      .upsert(fallback, { onConflict: "event_id,company_id,student_id" });
    if (fallbackError) throw fallbackError;
  } else if (error) {
    throw error;
  }
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
  const eventId = getFormValue(formData, "eventId");
  const industry = getFormValue(formData, "industry");

  if (!eventId) {
    throw new Error("Event må være valgt.");
  }

  const query = supabase.from("companies").select("id");
  const { data: companies, error: companiesError } = industry
    ? await query.eq("industry", industry)
    : await query;

  if (companiesError) throw companiesError;
  const companyIds = (companies ?? []).map((company) => company.id);

  if (companyIds.length === 0) return;

  const now = new Date().toISOString();
  const payload = companyIds.map((companyId) => ({
    event_id: eventId,
    company_id: companyId,
    student_id: student.id,
    consent: true,
    scope: "contact",
    consented_at: now,
    created_at: now,
    updated_at: now,
    updated_by: user.id,
  }));

  const adminSupabase = createAdminSupabaseClient();
  const { error } = await adminSupabase
    .from("consents")
    .upsert(payload, { onConflict: "event_id,company_id,student_id" });

  if (error?.code === "PGRST204" || error?.message?.includes("updated_at")) {
    const fallbackPayload = payload.map((row) => {
      const cleaned = { ...row } as { updated_at?: string; updated_by?: string };
      delete cleaned.updated_at;
      delete cleaned.updated_by;
      return cleaned;
    }) as unknown as typeof payload;
    const { error: fallbackError } = await adminSupabase
      .from("consents")
      .upsert(fallbackPayload, { onConflict: "event_id,company_id,student_id" });
    if (fallbackError) throw fallbackError;
  } else if (error) {
    throw error;
  }
  revalidatePath("/student/consents");
}
