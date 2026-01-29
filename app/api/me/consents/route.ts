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

  const { data, error } = await admin
    .from("consents")
    .select("company:companies(id, name), consent, updated_at")
    .eq("student_id", student.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    (data ?? []).map((row) => ({
      companyId: row.company?.id ?? "",
      companyName: row.company?.name ?? "",
      consentGiven: row.consent,
      updatedAt: row.updated_at ?? null,
    })),
  );
}
