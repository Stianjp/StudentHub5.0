import type { TableRow } from "@/lib/types/database";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type Student = TableRow<"students">;
type Consent = TableRow<"consents">;

export type StudentConsent = Consent & {
  company: { id: string; name: string } | null;
  event: { id: string; name: string } | null;
};

type ConsentInput = {
  eventId?: string | null;
  companyId: string;
  studentId: string;
  consent: boolean;
  scope: string;
  answers?: Record<string, string | undefined>;
};

function deriveStudentName(email: string | null | undefined) {
  if (!email) return null;
  const [local] = email.split("@");
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return null;
  return cleaned
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function getOrCreateStudentForUser(userId: string, email?: string | null) {
  const supabase = await createServerSupabaseClient();
  const normalizedEmail = email ? email.toLowerCase() : null;

  const { data: existingRows, error: readError } = await supabase
    .from("students")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (readError) throw readError;
  const existing = existingRows?.[0] ?? null;
  if (existing) return existing as Student;

  if (normalizedEmail) {
    try {
      const admin = createAdminSupabaseClient();
      const { data: byEmail, error: emailError } = await admin
        .from("students")
        .select("*")
        .eq("email", normalizedEmail)
        .order("created_at", { ascending: false })
        .limit(1);
      if (emailError) throw emailError;
      const matched = byEmail?.[0] ?? null;
      if (matched) {
        if (!matched.user_id) {
          await admin
            .from("students")
            .update({ user_id: userId, updated_at: new Date().toISOString() })
            .eq("id", matched.id);
        }
        return matched as Student;
      }
    } catch {
      // Fallback to insert below if service role not available.
    }
  }

  const now = new Date().toISOString();
  const { data: created, error: insertError } = await supabase
    .from("students")
    .insert({
      user_id: userId,
      email: normalizedEmail,
      full_name: deriveStudentName(normalizedEmail),
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (insertError) {
    const code = (insertError as { code?: string }).code;
    if (code === "23505" && normalizedEmail) {
      const admin = createAdminSupabaseClient();
      const { data: fallback } = await admin
        .from("students")
        .select("*")
        .eq("email", normalizedEmail)
        .order("created_at", { ascending: false })
        .limit(1);
      if (fallback?.[0]) return fallback[0] as Student;
    }
    throw insertError;
  }
  return created as Student;
}

export async function getOrCreateStudentByEmail(email: string) {
  const admin = createAdminSupabaseClient();
  const normalized = email.toLowerCase();

  const { data: existing, error: readError } = await admin
    .from("students")
    .select("*")
    .eq("email", normalized)
    .order("created_at", { ascending: false })
    .limit(1);

  if (readError) throw readError;
  if (existing && existing.length > 0) {
    return existing[0] as Student;
  }

  const now = new Date().toISOString();
  const { data: created, error: insertError } = await admin
    .from("students")
    .insert({
      email: normalized,
      full_name: deriveStudentName(normalized),
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (insertError) {
    const code = (insertError as { code?: string }).code;
    if (code === "23505") {
      const { data: fallback } = await admin
        .from("students")
        .select("*")
        .eq("email", normalized)
        .order("created_at", { ascending: false })
        .limit(1);
      if (fallback?.[0]) return fallback[0] as Student;
    }
    throw insertError;
  }
  return created as Student;
}

export async function listStudentConsents(studentId: string) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient();
  } catch {
    // Use session-based client if service role is missing.
  }

  const { data, error } = await supabase
    .from("consents")
    .select("*, company:companies(id, name), event:events(id, name)")
    .eq("student_id", studentId)
    .order("consented_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as StudentConsent[];
}

export async function submitConsent(input: ConsentInput) {
  const supabase = await createServerSupabaseClient();
  const now = new Date().toISOString();

  const { data: consentRow, error: consentError } = await supabase
    .from("consents")
    .upsert(
      {
        event_id: input.eventId ?? null,
        company_id: input.companyId,
        student_id: input.studentId,
        consent: input.consent,
        scope: input.scope,
        consented_at: now,
        created_at: now,
      },
      { onConflict: "student_id,company_id" },
    )
    .select("*")
    .single();

  if (consentError) throw consentError;

  if (input.eventId && input.answers && Object.keys(input.answers).length > 0) {
    const { error: surveyError } = await supabase.from("survey_responses").insert({
      event_id: input.eventId,
      company_id: input.companyId,
      student_id: input.studentId,
      answers: input.answers,
      created_at: now,
    });

    if (surveyError) throw surveyError;
  }

  return consentRow;
}

export async function recordStandVisit(input: {
  eventId: string;
  companyId?: string | null;
  studentId?: string | null;
  source: "qr" | "kiosk";
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("stand_visits").insert({
    event_id: input.eventId,
    company_id: input.companyId ?? null,
    student_id: input.studentId ?? null,
    source: input.source,
    metadata: input.metadata ?? {},
  });

  if (error) throw error;
}

export async function submitKioskSurvey(input: {
  eventId: string;
  answers: Record<string, string | string[]>;
}) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("survey_responses").insert({
    event_id: input.eventId,
    answers: input.answers,
  });

  if (error) throw error;
}
