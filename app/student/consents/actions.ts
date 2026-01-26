"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser } from "@/lib/student";

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
  const { error } = await supabase
    .from("consents")
    .upsert(
      {
        event_id: eventId,
        company_id: companyId,
        student_id: student.id,
        consent: true,
        scope: "contact",
        consented_at: now,
        created_at: now,
      },
      { onConflict: "event_id,company_id,student_id" },
    );

  if (error) throw error;
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
  const { error } = await supabase
    .from("consents")
    .upsert(
      {
        event_id: eventId,
        company_id: companyId,
        student_id: student.id,
        consent: false,
        scope: "contact",
        consented_at: now,
        created_at: now,
      },
      { onConflict: "event_id,company_id,student_id" },
    );

  if (error) throw error;
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
  }));

  const { error } = await supabase
    .from("consents")
    .upsert(payload, { onConflict: "event_id,company_id,student_id" });

  if (error) throw error;
  revalidatePath("/student/consents");
}
