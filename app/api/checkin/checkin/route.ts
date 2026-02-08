import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type Body = {
  eventId: string;
  ticketId: string;
  printerUrl?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;
  const eventId = body?.eventId?.trim();
  const ticketId = body?.ticketId?.trim();
  const printerUrl = body?.printerUrl?.trim();

  if (!eventId || !ticketId) {
    return NextResponse.json({ error: "Event og ticket mangler." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { data: ticket, error } = await supabase
    .from("event_tickets")
    .update({ checked_in_at: now, status: "checked_in", updated_at: now })
    .eq("id", ticketId)
    .eq("event_id", eventId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let student: { full_name: string | null; email: string | null; phone: string | null; study_program: string | null; study_level: string | null; study_year: number | null } | null = null;
  if (ticket?.student_id) {
    const { data: studentRow } = await supabase
      .from("students")
      .select("full_name, email, phone, study_program, study_level, study_year")
      .eq("id", ticket.student_id)
      .maybeSingle();
    student = studentRow ?? null;
  }

  if (printerUrl) {
    await fetch(printerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketNumber: ticket.ticket_number,
        fullName: student?.full_name ?? "",
        studyProgram: student?.study_program ?? "",
        studyLevel: student?.study_level ?? "",
        studyYear: student?.study_year ?? "",
        email: student?.email ?? "",
        phone: student?.phone ?? "",
      }),
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true, ticket });
}
