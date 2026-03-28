import { startOfHour } from "date-fns";
import { cache } from "react";
import type { TableRow } from "@/lib/types/database";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { computeMatch } from "@/lib/matching";
import { reconcileApprovedCompanyPortalInvites } from "@/lib/event-registration";

type Company = TableRow<"companies">;
type EventCompany = TableRow<"event_companies">;
type Event = TableRow<"events">;
type Student = TableRow<"students">;
type StudentPublic = TableRow<"student_public_profiles">;
type Consent = TableRow<"consents">;
type StandVisit = TableRow<"stand_visits">;
type Lead = TableRow<"leads">;
const REGISTRATION_LOGO_BUCKET = "event-registration-assets";

type EventRegistration = EventCompany & { event: Event };

const COMPANY_ATTENDEE_TICKET_LIMITS: Record<string, number> = {
  standard: 2,
  silver: 3,
  gold: 6,
  platinum: 8,
};

export function hasPremiumPackageAccess(packageTier: string | null | undefined) {
  return packageTier === "gold" || packageTier === "platinum";
}

export function getCompanyAttendeeTicketLimit(packageTier: string | null | undefined) {
  if (!packageTier) return COMPANY_ATTENDEE_TICKET_LIMITS.standard;
  return COMPANY_ATTENDEE_TICKET_LIMITS[packageTier] ?? COMPANY_ATTENDEE_TICKET_LIMITS.standard;
}

export function getCompanyAttendeeTicketAllowance(input: {
  package: string | null | undefined;
  extra_attendee_tickets?: number | null;
}) {
  const baseLimit = getCompanyAttendeeTicketLimit(input.package);
  const extra = Number.isFinite(input.extra_attendee_tickets)
    ? Math.max(Number(input.extra_attendee_tickets), 0)
    : 0;
  return baseLimit + extra;
}

export function hasRoiAccessForRegistration(input: {
  package: string | null | undefined;
  can_view_roi?: boolean | null;
}) {
  return hasPremiumPackageAccess(input.package) || Boolean(input.can_view_roi);
}

export function hasLeadDetailsAccessForRegistration(input: {
  package: string | null | undefined;
  can_view_leads?: boolean | null;
}) {
  return hasPremiumPackageAccess(input.package) || Boolean(input.can_view_leads);
}

export const getOrCreateCompanyForUser = cache(async function getOrCreateCompanyForUser(
  userId: string,
  email?: string | null,
) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient() as unknown as typeof supabase;
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

  if (email) {
    await reconcileApprovedCompanyPortalInvites(userId, email);

    const { data: invitedMembership } = await supabase
      .from("company_users")
      .select("company_id, approved_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (invitedMembership?.company_id && invitedMembership.approved_at) {
      const { data: company } = await supabase
        .from("companies")
        .select("*")
        .eq("id", invitedMembership.company_id)
        .maybeSingle();

      if (company) return company as Company;
    }
  }

  return null;
});

export const getCompanyAccessStatus = cache(async function getCompanyAccessStatus(userId: string) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient() as unknown as typeof supabase;
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
});

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

export async function getLatestCompanyRegistrationLogo(companyId: string) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient() as unknown as typeof supabase;
  } catch {
    // fallback
  }

  const { data: application, error } = await supabase
    .from("event_registration_applications")
    .select("logo_path, event_id")
    .eq("company_id", companyId)
    .not("logo_path", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!application?.logo_path) return null;

  const [{ data: signed }, { data: event }] = await Promise.all([
    supabase.storage.from(REGISTRATION_LOGO_BUCKET).createSignedUrl(application.logo_path, 60 * 60),
    supabase.from("events").select("name").eq("id", application.event_id).maybeSingle(),
  ]);

  return {
    logoUrl: signed?.signedUrl ?? null,
    eventName: event?.name ?? null,
  };
}

export async function getCompanyAttendeeCountByEvent(companyId: string) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient() as unknown as typeof supabase;
  } catch {
    // fallback
  }

  const { data, error } = await supabase
    .from("event_tickets")
    .select("company_id, event_id")
    .eq("company_id", companyId);

  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
  }

  return counts;
}

export async function getCompanyLeads(companyId: string) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient() as unknown as typeof supabase;
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

  const typedConsents = (consents ?? []) as Consent[];
  const consentMap = new Map(
    typedConsents.map((row) => [row.student_id, row]),
  );

  const { data: students } = await supabase
    .from("students")
    .select("*")
    .in("id", studentIds);

  const { data: events } = await supabase
    .from("events")
    .select("id, name")
    .in("id", leadRows.map((lead) => lead.event_id).filter(Boolean) as string[]);

  const typedStudents = (students ?? []) as Student[];
  const typedEvents = (events ?? []) as Array<{ id: string; name: string | null }>;
  const studentMap = new Map(typedStudents.map((row) => [row.id, row]));
  const eventMap = new Map(typedEvents.map((row) => [row.id, row]));

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
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient() as unknown as typeof supabase;
  } catch {
    // fallback
  }

  const now = Date.now();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id" as never, userId as never)
    .maybeSingle();
  if (profileError) throw profileError;
  const typedProfile = profile as { role?: string } | null;

  const isAdmin = typedProfile?.role === "admin";

  if (!isAdmin) {
    const { data: membership, error: membershipError } = await supabase
      .from("company_users")
      .select("id, approved_at")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership?.approved_at) return false;
  }

  const { data: registration, error: registrationError } = await supabase
    .from("event_companies")
    .select("package, can_view_roi, access_from, access_until")
    .eq("company_id", companyId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (registrationError) throw registrationError;
  if (!registration) return false;

  if (!hasRoiAccessForRegistration(registration)) return false;

  if (registration.access_from) {
    const startsAt = new Date(registration.access_from).getTime();
    if (Number.isFinite(startsAt) && startsAt > now) return false;
  }

  if (registration.access_until) {
    const endsAt = new Date(registration.access_until).getTime();
    if (Number.isFinite(endsAt) && endsAt < now) return false;
  }

  return true;
}

export type RoiMetrics = {
  visitsCount: number;
  leadsCount: number;
  conversion: number;
  targetLevels: string[];
  targetYearsBachelor: number[];
  targetYearsMaster: number[];
  leadsByLevel: Array<{ level: string; count: number }>;
  leadsByYearBachelor: Array<{ year: number; count: number }>;
  leadsByYearMaster: Array<{ year: number; count: number }>;
  visitsByHour: Array<{ hour: string; count: number }>;
  topStudyPrograms: Array<{ program: string; count: number }>;
};

export async function getRoiMetrics(companyId: string, eventId: string): Promise<RoiMetrics> {
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
      .eq("consent" as never, true as never),
    supabase
      .from("leads")
      .select("study_level, study_year, field_of_study")
      .eq("company_id", companyId)
      .eq("event_id", eventId),
    supabase
      .from("companies")
      .select("id, recruitment_levels, recruitment_years_bachelor, recruitment_years_master")
      .eq("id", companyId)
      .single(),
  ]);

  if (visitsError) throw visitsError;
  if (consentsError) throw consentsError;
  if (leadsError) throw leadsError;
  if (companyError) throw companyError;

  const visitRows = (visits ?? []) as StandVisit[];
  const consentRows = (consents ?? []) as Consent[];
  const leadRows = (leads ?? []) as unknown as Array<{
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
    const typedStudents = (students ?? []) as Array<{ id: string; study_program: string | null }>;

    typedStudents.forEach((student) => {
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
