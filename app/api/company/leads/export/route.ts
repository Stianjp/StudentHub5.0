import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getCompanyLeads,
  getCompanyRegistrations,
  getOrCreateCompanyForUser,
  hasLeadDetailsAccessForRegistration,
} from "@/lib/company";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("id, role").eq("id" as never, user.id as never).maybeSingle();
  const typedProfile = profile as { role?: string } | null;
  const role = typedProfile?.role;
  if (role !== "company" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const company = await getOrCreateCompanyForUser(user.id, user.email);
  if (!company) {
    return NextResponse.json({ error: "Tilgang til bedrift er ikke godkjent ennå." }, { status: 403 });
  }
  const registrations = await getCompanyRegistrations(company.id);
  const leadAccessByEvent = new Map(
    registrations.map((registration) => [
      registration.event_id,
      hasLeadDetailsAccessForRegistration(registration),
    ]),
  );
  const hasDetailedLeadAccess = Array.from(leadAccessByEvent.values()).some(Boolean);
  if (!hasDetailedLeadAccess) {
    return NextResponse.json({ error: "Eksport krever Gull/Platinum eller ekstra Leads-tilgang." }, { status: 403 });
  }
  const leads = (await getCompanyLeads(company.id)).filter(({ lead }) =>
    lead.event_id ? (leadAccessByEvent.get(lead.event_id) ?? false) : hasDetailedLeadAccess,
  );
  const typedLeads = leads as Array<{
    lead: {
      id: string;
      event_id: string | null;
      interests: string[] | null;
      job_types: string[] | null;
      study_level: string | null;
      study_year: number | null;
      field_of_study: string | null;
      source: string;
      created_at: string;
    };
    consent: { consent: boolean; updated_at: string | null } | null;
    student: {
      full_name: string | null;
      email: string | null;
      phone: string | null;
      study_program: string | null;
      study_level: string | null;
      study_year: number | null;
      graduation_year: number | null;
    } | null;
    event: { name?: string | null } | null;
  }>;

  const rows = typedLeads.map(({ lead, consent, student, event }) => {
    const level = lead.study_level ?? student?.study_level ?? "";
    const year = lead.study_year ?? student?.study_year ?? student?.graduation_year ?? "";
    const yearLabel = typeof year === "number" && year > 0 ? `${year}. år` : year ? String(year) : "";
    const studyYearText = [yearLabel, level].filter(Boolean).join(" ").trim();

    return {
    full_name: student?.full_name ?? "",
    email: consent?.consent ? student?.email ?? "" : "",
    phone: consent?.consent ? student?.phone ?? "" : "",
    study_program: lead.field_of_study ?? student?.study_program ?? "",
    study_year_text: studyYearText,
    interests: lead.interests?.join(" | ") ?? "",
    job_types: lead.job_types?.join(" | ") ?? "",
    consent_given: consent?.consent ? "true" : "false",
    consent_updated_at: consent?.updated_at ?? "",
    source: lead.source,
    event_name: event?.name ?? "",
    created_at: lead.created_at,
    };
  });

  const csv = toCsv(rows);
  const filename = `leads-${company.id}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  });
}
