import { startOfHour } from "date-fns";
import type { TableRow } from "@/lib/types/database";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { computeMatch } from "@/lib/matching";

type Company = TableRow<"companies">;
type EventCompany = TableRow<"event_companies">;
type Event = TableRow<"events">;
type Student = TableRow<"students">;
type StudentPublic = TableRow<"student_public_profiles">;
type Consent = TableRow<"consents">;
type StandVisit = TableRow<"stand_visits">;
type Lead = TableRow<"leads">;

type EventRegistration = EventCompany & { event: Event };

function deriveCompanyName(email: string | null | undefined) {
  if (!email) return "Ny bedrift";
  const [local] = email.split("@");
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return "Ny bedrift";
  return cleaned
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function getOrCreateCompanyForUser(userId: string, email?: string | null) {
  const supabase = await createServerSupabaseClient();

  const { data: existingRows, error: readError } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (readError) throw readError;
  const existing = existingRows?.[0] ?? null;
  if (existing) return existing;

  const now = new Date().toISOString();
  const { data: created, error: insertError } = await supabase
    .from("companies")
    .insert({
      user_id: userId,
      name: deriveCompanyName(email),
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (insertError) throw insertError;
  return created;
}

export async function getCompanyRegistrations(companyId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("event_companies")
    .select("*, event:events(*)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as EventRegistration[];
}

export async function getCompanyLeads(companyId: string) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient();
  } catch {
    // fallback
  }

  const { data: leads, error: leadError } = await supabase
    .from("leads")
    .select("*, student:students(*), event:events(id, name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (leadError) throw leadError;

  const leadRows = (leads ?? []) as Array<
    Lead & { student: Student | null; event?: { id: string; name: string } | null }
  >;

  if (leadRows.length === 0) return [];

  const studentIds = leadRows.map((row) => row.student_id);
  const { data: consents, error: consentError } = await supabase
    .from("consents")
    .select("*")
    .eq("company_id", companyId)
    .in("student_id", studentIds);

  if (consentError) throw consentError;

  const consentMap = new Map(
    (consents ?? []).map((row) => [row.student_id, row as Consent]),
  );

  return leadRows.map((lead) => ({
    lead,
    consent: consentMap.get(lead.student_id) ?? null,
    student: lead.student ?? null,
    event: lead.event ?? null,
  }));
}

export async function computeAndStoreMatches(company: Company, eventId?: string | null) {
  if (!eventId) return [];
  const supabase = await createServerSupabaseClient();

  const { data: students, error: studentsError } = await supabase
    .from("student_public_profiles")
    .select("*");
  if (studentsError) throw studentsError;

  const rows = (students ?? []) as StudentPublic[];
  const now = new Date().toISOString();

  const payload = rows.map((student) => {
    const match = computeMatch(student, company);
    return {
      event_id: eventId,
      company_id: company.id,
      student_id: student.student_id,
      score: match.score,
      reasons: match.reasons,
      created_at: now,
      updated_at: now,
    };
  });

  if (payload.length === 0) return [];

  const { data, error } = await supabase
    .from("match_scores")
    .upsert(payload, { onConflict: "event_id,company_id,student_id" })
    .select("*")
    .order("score", { ascending: false })
    .limit(25);

  if (error) throw error;
  return data ?? [];
}

export async function getTopMatches(company: Company, eventId?: string | null) {
  if (!eventId) return [];
  const supabase = await createServerSupabaseClient();

  const { data: existing, error } = await supabase
    .from("match_scores")
    .select("*")
    .eq("company_id", company.id)
    .eq("event_id", eventId)
    .order("score", { ascending: false })
    .limit(10);

  if (error) throw error;

  if (!existing || existing.length === 0) {
    const computed = await computeAndStoreMatches(company, eventId);
    return computed.slice(0, 10);
  }

  return existing;
}

export async function hasPlatinumAccess(userId: string, eventId: string, companyId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("has_platinum_access", {
    uid: userId,
    event_uuid: eventId,
    company_uuid: companyId,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function getRoiMetrics(companyId: string, eventId: string) {
  const supabase = await createServerSupabaseClient();

  const [{ data: visits, error: visitsError }, { data: consents, error: consentsError }] =
    await Promise.all([
      supabase
        .from("stand_visits")
        .select("*")
        .eq("company_id", companyId)
        .eq("event_id", eventId),
      supabase
        .from("consents")
        .select("*")
        .eq("company_id", companyId)
        .eq("event_id", eventId)
        .eq("consent", true),
    ]);

  if (visitsError) throw visitsError;
  if (consentsError) throw consentsError;

  const visitRows = (visits ?? []) as StandVisit[];
  const consentRows = (consents ?? []) as Consent[];

  const visitsCount = visitRows.length;
  const leadsCount = consentRows.length;
  const conversion = visitsCount === 0 ? 0 : Math.round((leadsCount / visitsCount) * 100);

  const hourly = new Map<string, number>();
  visitRows.forEach((visit) => {
    const hourKey = startOfHour(new Date(visit.created_at)).toISOString();
    hourly.set(hourKey, (hourly.get(hourKey) ?? 0) + 1);
  });

  const studyCounts = new Map<string, number>();
  if (consentRows.length > 0) {
    const studentIds = consentRows.map((row) => row.student_id);
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, study_program")
      .in("id", studentIds);

    if (studentsError) throw studentsError;

    (students ?? []).forEach((student) => {
      const program = student.study_program ?? "Ukjent";
      studyCounts.set(program, (studyCounts.get(program) ?? 0) + 1);
    });
  }

  return {
    visitsCount,
    leadsCount,
    conversion,
    visitsByHour: Array.from(hourly.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour)),
    topStudyPrograms: Array.from(studyCounts.entries())
      .map(([program, count]) => ({ program, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };
}
