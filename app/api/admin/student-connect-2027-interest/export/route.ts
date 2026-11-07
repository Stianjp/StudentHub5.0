import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { toCsv } from "@/lib/csv";
import type { TableRow } from "@/lib/types/database";

function safeCsvCell(value: string) {
  return /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
}

export async function GET() {
  const session = await createServerSupabaseClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data: profile } = await session.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = createAdminSupabaseClient();
  const interests: Pick<TableRow<"student_connect_2027_interest">, "company_name" | "email" | "consented_at">[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db
      .from("student_connect_2027_interest")
      .select("company_name, email, consented_at")
      .order("consented_at", { ascending: false })
      .order("email", { ascending: true })
      .range(offset, offset + 499);
    if (error) return NextResponse.json({ error: "Could not export interests." }, { status: 500 });
    interests.push(...((data ?? []) as typeof interests));
    if (!data || data.length < 500) break;
  }

  const csv = toCsv(interests.map((row) => ({
    company_name: safeCsvCell(row.company_name),
    email: safeCsvCell(row.email),
    consented_at: row.consented_at,
  })), ["company_name", "email", "consented_at"]);
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=student-connect-2027-interest.csv",
      "Cache-Control": "no-store",
    },
  });
}
