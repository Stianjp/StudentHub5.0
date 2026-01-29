import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser } from "@/lib/student";
import { upsertConsentForStudent } from "@/lib/lead";

type RouteParams = {
  params: Promise<{ companyId: string }>;
};

const payloadSchema = z.object({
  consentGiven: z.coerce.boolean(),
});

export async function PUT(request: Request, { params }: RouteParams) {
  const { companyId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Du må være logget inn." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ugyldig payload." }, { status: 400 });
  }

  const student = await getOrCreateStudentForUser(user.id, user.email ?? "");
  const consent = await upsertConsentForStudent({
    studentId: student.id,
    companyId,
    consentGiven: parsed.data.consentGiven,
    source: "student_portal",
  });

  return NextResponse.json({ consentGiven: consent.consent }, { status: 200 });
}
