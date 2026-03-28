import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getOrCreateStudentByEmail } from "@/lib/student";
import { createLead, filterExistingCompanyIds, upsertConsentForStudent } from "@/lib/lead";

const payloadSchema = z.object({
  email: z.string().email(),
  companyIds: z.array(z.string().uuid()).min(1),
  studyLevel: z.string().min(2),
  studyYear: z.number().int().min(1),
  fieldOfStudy: z.string().min(2),
  interests: z.array(z.string()).min(1),
  consent: z.boolean(),
  source: z.enum(["kiosk", "qr"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
      { status: 400 },
    );
  }

  if (!parsed.data.consent) {
    return NextResponse.json({ error: "Samtykke må gis." }, { status: 400 });
  }

  const student = await getOrCreateStudentByEmail(parsed.data.email);
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const validCompanyIds = await filterExistingCompanyIds(parsed.data.companyIds);

  if (validCompanyIds.length === 0) {
    return NextResponse.json({ error: "Bedriften finnes ikke lenger." }, { status: 404 });
  }

  const leadPromises = validCompanyIds.map(async (companyId) => {
    const consent = await upsertConsentForStudent({
      studentId: student.id,
      companyId,
      eventId,
      consentGiven: true,
      source: "stand",
      consentTextVersion: "v1",
    });

    const lead = await createLead({
      student,
      companyId,
      eventId,
      interests: parsed.data.interests,
      jobTypes: parsed.data.interests,
      studyLevel: parsed.data.studyLevel,
      studyYear: parsed.data.studyYear,
      fieldOfStudy: parsed.data.fieldOfStudy,
      consentGiven: true,
      source: "stand",
    });

    if (!consent || !lead) {
      return;
    }

    await supabase.from("stand_visits").insert({
      event_id: eventId,
      company_id: companyId,
      student_id: student.id,
      source: parsed.data.source,
      created_at: now,
    });
  });

  await Promise.all(leadPromises);

  return NextResponse.json({ ok: true, companies: validCompanyIds.length }, { status: 201 });
}
