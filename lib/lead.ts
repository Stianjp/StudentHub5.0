import type { TableRow } from "@/lib/types/database";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type Student = TableRow<"students">;
type Lead = TableRow<"leads">;
type Consent = TableRow<"consents">;
type Company = TableRow<"companies">;

const MISSING_COMPANY_MESSAGE = "Bedriften finnes ikke lenger.";

export type LeadInput = {
  student: Student;
  companyId: string;
  eventId?: string | null;
  interests: string[];
  jobTypes: string[];
  studyLevel?: string | null;
  studyYear?: number | null;
  fieldOfStudy?: string | null;
  consentGiven: boolean;
  source: "stand" | "student_portal" | "ticket";
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export class CompanyNotFoundError extends Error {
  companyId: string;

  constructor(companyId: string) {
    super(MISSING_COMPANY_MESSAGE);
    this.name = "CompanyNotFoundError";
    this.companyId = companyId;
  }
}

export function isCompanyNotFoundError(error: unknown): error is CompanyNotFoundError {
  return error instanceof CompanyNotFoundError;
}

export async function getCompanyIfExists(companyId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as Pick<Company, "id"> | null;
}

export async function ensureCompanyExists(companyId: string) {
  const company = await getCompanyIfExists(companyId);
  if (!company) {
    throw new CompanyNotFoundError(companyId);
  }
  return company;
}

export async function filterExistingCompanyIds(companyIds: string[]) {
  const uniqueCompanyIds = Array.from(new Set(companyIds.map((companyId) => companyId.trim()).filter(Boolean)));
  if (uniqueCompanyIds.length === 0) return [];

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("companies").select("id").in("id", uniqueCompanyIds);
  if (error) throw error;

  const existingIds = new Set(((data ?? []) as Array<Pick<Company, "id">>).map((company) => company.id));
  return uniqueCompanyIds.filter((companyId) => existingIds.has(companyId));
}

export async function upsertConsentForStudent(input: {
  studentId: string;
  companyId: string;
  eventId?: string | null;
  consentGiven: boolean;
  source: "stand" | "student_portal" | "ticket";
  consentTextVersion?: string | null;
}) {
  const company = await getCompanyIfExists(input.companyId);
  if (!company) return null;

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("consents")
    .select("id, event_id, student_id, company_id")
    .eq("student_id", input.studentId)
    .eq("company_id", company.id)
    .maybeSingle();

  const payload = {
    student_id: input.studentId,
    company_id: company.id,
    event_id: input.eventId ?? existing?.event_id ?? null,
    consent: input.consentGiven,
    scope: "contact",
    consented_at: now,
    updated_at: now,
    source: input.source,
    consent_text_version: input.consentTextVersion ?? "v1",
    revoked_at: input.consentGiven ? null : now,
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from("consents")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as Consent;
  }

  const { data, error } = await supabase
    .from("consents")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data as Consent;
}

export async function createLead(input: LeadInput) {
  const company = await getCompanyIfExists(input.companyId);
  if (!company) return null;

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  let query = supabase
    .from("leads")
    .select("id, created_at, student_id, company_id, source")
    .eq("student_id", input.student.id)
    .eq("company_id", company.id)
    .eq("source", input.source)
    .order("created_at", { ascending: false })
    .limit(1);

  if (input.eventId) {
    query = query.eq("event_id", input.eventId);
  } else {
    query = query.is("event_id", null);
  }

  const { data: existing } = await query.maybeSingle();

  if (existing) {
    return existing as Lead;
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      student_id: input.student.id,
      company_id: company.id,
      event_id: input.eventId ?? null,
      interests: input.interests ?? [],
      job_types: input.jobTypes ?? [],
      study_level: input.studyLevel ?? null,
      study_year: input.studyYear ?? null,
      field_of_study: input.fieldOfStudy ?? null,
      source: input.source,
      created_at: now,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Lead;
}
