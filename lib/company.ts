import { startOfHour } from "date-fns";
import type { TableRow } from "@/lib/types/database";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { computeMatch } from "@/lib/matching";

type Company = TableRow<"companies">;
type CompanyUser = TableRow<"company_users">;
type CompanyDomain = TableRow<"company_domains">;
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
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient();
  } catch {
    // fallback
  }

  const { data: membership } = await supabase
    .from("company_users")
    .select("company_id, approved_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (membership?.company_id && membership.approved_at) {
    const { data: company } = await supabase
      .from("companies")
      .select("*")
      .eq("id", membership.company_id)
      .maybeSingle();
    if (company) return company as Company;
  }
  return null;
}

export async function getCompanyAccessStatus(userId: string) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient();
  } catch {
    // fallback
  }

  const { data: membership } = await supabase
    .from("company_users")
    .select("company_id, approved_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (membership?.company_id && membership.approved_at) {
    return { status: "approved" as const };
  }

  const { data: request } = await supabase
    .from("company_user_requests")
    .select("company_id, domain, email, created_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (request) {
    return {
      status: "pending" as const,
      domain: request.domain,
      email: request.email,
      companyId: request.company_id,
      createdAt: request.created_at,
    };
  }

  return { status: "missing" as const };
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
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (leadError) throw leadError;

  const leadRows = (leads ?? []) as Lead[];

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

  const { data: students } = await supabase
    .from("students")
    .select("*")
    .in("id", studentIds);

  const { data: events } = await supabase
    .from("events")
    .select("id, name")
    .in("id", leadRows.map((lead) => lead.event_id).filter(Boolean) as string[]);

  const studentMap = new Map((students ?? []).map((row) => [row.id, row as Student]));
  const eventMap = new Map((events ?? []).map((row) => [row.id, row]));

  return leadRows.map((lead) => ({
    lead,
    consent: consentMap.get(lead.student_id) ?? null,
    student: studentMap.get(lead.student_id) ?? null,
    event: lead.event_id ? eventMap.get(lead.event_id) ?? null : null,
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

  const [
    { data: visits, error: visitsError },
    { data: consents, error: consentsError },
    { data: leads, error: leadsError },
    { data: company, error: companyError },
  ] = await Promise.all([
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
    supabase
      .from("leads")
      .select("study_level, study_year, field_of_study")
      .eq("company_id", companyId)
      .eq("event_id", eventId),
    supabase
      .from("companies")
      .select("recruitment_levels, recruitment_years_bachelor, recruitment_years_master")
      .eq("id", companyId)
      .single(),
  ]);

  if (visitsError) throw visitsError;
  if (consentsError) throw consentsError;
  if (leadsError) throw leadsError;
  if (companyError) throw companyError;

  const visitRows = (visits ?? []) as StandVisit[];
  const consentRows = (consents ?? []) as Consent[];
  const leadRows = (leads ?? []) as Array<{
    study_level: string | null;
    study_year: number | null;
    field_of_study: string | null;
  }>;

  const visitsCount = visitRows.length;
  const leadsCount = consentRows.length;
  const conversion = visitsCount === 0 ? 0 : Math.round((leadsCount / visitsCount) * 100);

  const hourly = new Map<string, number>();
  visitRows.forEach((visit) => {
    const hourKey = startOfHour(new Date(visit.created_at)).toISOString();
    hourly.set(hourKey, (hourly.get(hourKey) ?? 0) + 1);
  });

  const studyCounts = new Map<string, number>();
  if (leadRows.length > 0) {
    leadRows.forEach((lead) => {
      const program = lead.field_of_study ?? "Ukjent";
      studyCounts.set(program, (studyCounts.get(program) ?? 0) + 1);
    });
  } else if (consentRows.length > 0) {
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

  const levelCounts = new Map<string, number>();
  const yearCountsBachelor = new Map<number, number>();
  const yearCountsMaster = new Map<number, number>();
  leadRows.forEach((lead) => {
    const level = lead.study_level?.toLowerCase();
    const year = lead.study_year ?? null;
    if (level) {
      const label = level.includes("master") ? "Master" : level.includes("bachelor") ? "Bachelor" : lead.study_level;
      levelCounts.set(label ?? "Ukjent", (levelCounts.get(label ?? "Ukjent") ?? 0) + 1);
    }
    if (year && Number.isFinite(year) && year >= 1 && year <= 5) {
      if (level?.includes("master") || year >= 4) {
        yearCountsMaster.set(year, (yearCountsMaster.get(year) ?? 0) + 1);
      } else {
        yearCountsBachelor.set(year, (yearCountsBachelor.get(year) ?? 0) + 1);
      }
    }
  });

  return {
    visitsCount,
    leadsCount,
    conversion,
    targetLevels: company.recruitment_levels ?? [],
    targetYearsBachelor: company.recruitment_years_bachelor ?? [],
    targetYearsMaster: company.recruitment_years_master ?? [],
    leadsByLevel: Array.from(levelCounts.entries())
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => b.count - a.count),
    leadsByYearBachelor: Array.from(yearCountsBachelor.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year),
    leadsByYearMaster: Array.from(yearCountsMaster.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year),
    visitsByHour: Array.from(hourly.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour)),
    topStudyPrograms: Array.from(studyCounts.entries())
      .map(([program, count]) => ({ program, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };
}
