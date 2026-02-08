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
    .select("*, student:students(id, full_name, email, phone, study_program, study_level, study_year)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (printerUrl) {
    await fetch(printerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketNumber: ticket.ticket_number,
        fullName: ticket.student?.full_name ?? "",
        studyProgram: ticket.student?.study_program ?? "",
        studyLevel: ticket.student?.study_level ?? "",
        studyYear: ticket.student?.study_year ?? "",
        email: ticket.student?.email ?? "",
        phone: ticket.student?.phone ?? "",
      }),
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true, ticket });
}
