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
  const leads = await getCompanyLeads(company.id);

  const rows = leads.map(({ consent, student }) => ({
    consented_at: consent.consented_at,
    student_id: consent.student_id,
    full_name: student?.full_name ?? "",
    email: student?.email ?? "",
    phone: student?.phone ?? "",
    study_program: student?.study_program ?? "",
    study_level: student?.study_level ?? "",
    job_types: student?.job_types.join(" | ") ?? "",
    values: student?.values.join(" | ") ?? "",
  }));

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
