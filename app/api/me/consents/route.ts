import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getOrCreateStudentForUser } from "@/lib/student";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Du må være logget inn." }, { status: 401 });
  }

  const student = await getOrCreateStudentForUser(user.id, user.email ?? "");
  const admin = createAdminSupabaseClient();

  const { data: consents, error } = await admin
    .from("consents")
    .select("company_id, consent, updated_at")
    .eq("student_id", student.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const companyIds = Array.from(new Set((consents ?? []).map((row) => row.company_id)));
  const { data: companies } = await admin
    .from("companies")
    .select("id, name")
    .in("id", companyIds);

  const companyMap = new Map((companies ?? []).map((company) => [company.id, company.name ?? ""]));

  return NextResponse.json(
    (consents ?? []).map((row) => ({
      companyId: row.company_id,
      companyName: companyMap.get(row.company_id) ?? "",
      consentGiven: row.consent,
      updatedAt: row.updated_at ?? null,
    })),
  );
}
