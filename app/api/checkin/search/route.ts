import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return profile?.role === "admin";
}

type Body = {
  eventId: string;
  query: string;
  mode?: "ticket" | "text";
};

export async function POST(request: Request) {
  const isAdmin = await requireAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as Body | null;
  const eventId = body?.eventId?.trim();
  const query = body?.query?.trim();

  if (!eventId || !query) {
    return NextResponse.json({ error: "Event og søk er påkrevd." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  if (body?.mode === "ticket") {
    const { data, error } = await supabase
      .from("event_tickets")
      .select("*, student:students(id, full_name, email, phone, study_program, study_level, study_year)")
      .eq("event_id", eventId)
      .eq("ticket_number", query)
      .limit(20);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ results: data ?? [] });
  }

  const [{ data: students, error: studentError }, { data: ticketAttendees, error: attendeeError }] =
    await Promise.all([
      supabase
        .from("students")
        .select("id, full_name, email, phone, study_program, study_level, study_year")
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(50),
      supabase
        .from("event_tickets")
        .select("*")
        .eq("event_id", eventId)
        .or(`attendee_name.ilike.%${query}%,attendee_email.ilike.%${query}%,attendee_phone.ilike.%${query}%`)
        .limit(100),
    ]);

  if (studentError) return NextResponse.json({ error: studentError.message }, { status: 500 });
  if (attendeeError) return NextResponse.json({ error: attendeeError.message }, { status: 500 });

  const studentIds = (students ?? []).map((student) => student.id);
  const { data: ticketsByStudent, error: ticketError } = studentIds.length
    ? await supabase
        .from("event_tickets")
        .select("*")
        .eq("event_id", eventId)
        .in("student_id", studentIds)
        .limit(100)
    : { data: [], error: null };

  if (ticketError) return NextResponse.json({ error: ticketError.message }, { status: 500 });

  const studentMap = new Map((students ?? []).map((student) => [student.id, student]));
  const merged = new Map<string, any>();

  (ticketsByStudent ?? []).forEach((ticket) => {
    merged.set(ticket.id, { ...ticket, student: studentMap.get(ticket.student_id ?? "") ?? null });
  });
  (ticketAttendees ?? []).forEach((ticket) => {
    if (!merged.has(ticket.id)) {
      merged.set(ticket.id, { ...ticket, student: studentMap.get(ticket.student_id ?? "") ?? null });
    }
  });

  return NextResponse.json({ results: Array.from(merged.values()) });
}
