import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { leadUpsertSchema } from "@/lib/validation/lead";
import { getOrCreateStudentByEmail, getOrCreateStudentForUser } from "@/lib/student";
import { createLead, ensureCompanyExists, upsertConsentForStudent } from "@/lib/lead";
import { recordStandVisit } from "@/lib/student";

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

const includeNoConsentSchema = z.object({
  includeNoConsent: z.enum(["true", "false"]).optional(),
});

export async function POST(request: Request, { params }: RouteParams) {
  const { companyId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload = await request.json();
  const parsed = leadUpsertSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
      { status: 400 },
    );
  }

  const email = parsed.data.email ?? user?.email ?? "";
  if (!email) {
    return NextResponse.json({ error: "E-post mangler." }, { status: 400 });
  }

  try {
    await ensureCompanyExists(companyId);
  } catch {
    return NextResponse.json({ error: "Bedriften finnes ikke lenger." }, { status: 404 });
  }

  const student = user
    ? await getOrCreateStudentForUser(user.id, email)
    : await getOrCreateStudentByEmail(email);

  const consent = await upsertConsentForStudent({
    studentId: student.id,
    companyId,
    eventId: parsed.data.eventId ?? null,
    consentGiven: parsed.data.consentToBeContacted,
    source: parsed.data.source,
    consentTextVersion: "v1",
  });

  const lead = await createLead({
    student,
    companyId,
    eventId: parsed.data.eventId ?? null,
    interests: parsed.data.interests,
    jobTypes: parsed.data.jobTypes,
    studyLevel: parsed.data.studyLevel || student.study_level,
    studyYear: parsed.data.studyYear ? Number(parsed.data.studyYear) : student.study_year ?? student.graduation_year,
    fieldOfStudy: parsed.data.fieldOfStudy || student.study_program,
    consentGiven: parsed.data.consentToBeContacted,
    source: parsed.data.source,
  });

  if (parsed.data.source === "stand" && parsed.data.eventId) {
    await recordStandVisit({
      eventId: parsed.data.eventId,
      companyId,
      studentId: student.id,
      source: "qr",
      metadata: { flow: "stand" },
    });
  }

  if (!consent || !lead) {
    return NextResponse.json({ error: "Bedriften finnes ikke lenger." }, { status: 404 });
  }

  return NextResponse.json(
    { leadId: lead.id, consentGiven: consent.consent, consentId: consent.id },
    { status: 201 },
  );
}

export async function GET(request: Request, { params }: RouteParams) {
  const { companyId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Du må være logget inn." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("id, role").eq("id" as never, user.id as never).maybeSingle();
  const typedProfile = profile as { role?: string } | null;
  if (!profile) {
    return NextResponse.json({ error: "Fant ikke profil." }, { status: 403 });
  }

  const query = includeNoConsentSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );
  const includeNoConsent = query.success ? query.data.includeNoConsent !== "false" : true;

  const admin = createAdminSupabaseClient();
  const { data: company } = await admin.from("companies").select("id, user_id").eq("id", companyId).maybeSingle();

  if (!company || (typedProfile?.role !== "admin" && company.user_id !== user.id)) {
    return NextResponse.json({ error: "Ingen tilgang til bedriften." }, { status: 403 });
  }

  const { data: leads, error } = await admin
    .from("leads")
    .select("*, student:students(id, full_name, email, phone, study_program, study_level, study_year, graduation_year)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const typedLeads = (leads ?? []) as Array<{
    id: string;
    student_id: string;
    student: {
      id: string;
      full_name: string | null;
      email: string | null;
      phone: string | null;
      study_program: string | null;
      study_level: string | null;
      study_year: number | null;
      graduation_year: number | null;
    } | null;
    interests: string[] | null;
    job_types: string[] | null;
    study_level: string | null;
    study_year: number | null;
    field_of_study: string | null;
    source: string;
    event_id: string | null;
    created_at: string;
  }>;
  const studentIds = typedLeads.map((lead) => lead.student_id);
  const { data: consents } = await admin
    .from("consents")
    .select("company_id, student_id, consent, updated_at")
    .eq("company_id", companyId)
    .in("student_id", studentIds);
  const typedConsents = (consents ?? []) as Array<{
    student_id: string;
    consent: boolean;
    updated_at: string | null;
  }>;

  const consentMap = new Map(
    typedConsents.map((row) => [row.student_id, { consent: row.consent, updated_at: row.updated_at }]),
  );

  const rows = typedLeads
    .map((lead) => {
      const consent = consentMap.get(lead.student_id);
      return {
        leadId: lead.id,
        student: lead.student,
        interests: lead.interests,
        jobTypes: lead.job_types,
        studyLevel: lead.study_level,
        studyYear: lead.study_year,
        fieldOfStudy: lead.field_of_study,
        consentGiven: consent?.consent ?? false,
        consentUpdatedAt: consent?.updated_at ?? null,
        source: lead.source,
        eventId: lead.event_id,
        createdAt: lead.created_at,
      };
    })
    .filter((row) => includeNoConsent || row.consentGiven);

  return NextResponse.json(rows, { status: 200 });
}
