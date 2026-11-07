import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const schema = z.object({
  companyName: z.string().trim().min(2).max(160),
  email: z.string().trim().pipe(z.email().max(254)).transform((value) => value.toLowerCase()),
  consent: z.literal(true),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Company name, valid e-mail and consent are required." }, { status: 400 });
  }

  try {
    const { error } = await createAdminSupabaseClient()
      .from("student_connect_2027_interest")
      .upsert({
        company_name: parsed.data.companyName,
        email: parsed.data.email,
        consented_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "email" });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not save your request." }, { status: 500 });
  }
}
