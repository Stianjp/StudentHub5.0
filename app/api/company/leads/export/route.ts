import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCompanyLeads, getOrCreateCompanyForUser } from "@/lib/company";
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

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = profile?.role;
  if (role !== "company" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const company = await getOrCreateCompanyForUser(user.id, user.email);
  if (!company) {
    return NextResponse.json({ error: "Tilgang til bedrift er ikke godkjent ennå." }, { status: 403 });
  }
  const leads = await getCompanyLeads(company.id);

  const rows = leads.map(({ lead, consent, student, event }) => {
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
