"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser } from "@/lib/student";

export async function giveConsentToCompany(formData: FormData) {
  await requireRole("student");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");

  const student = await getOrCreateStudentForUser(user.id, user.email);
  const eventId = formData.get("eventId")?.toString() ?? "";
  const companyId = formData.get("companyId")?.toString() ?? "";

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

export async function giveConsentToAll(formData: FormData) {
  await requireRole("student");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");

  const student = await getOrCreateStudentForUser(user.id, user.email);
  const eventId = formData.get("eventId")?.toString() ?? "";
  const industry = formData.get("industry")?.toString() ?? "";

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
