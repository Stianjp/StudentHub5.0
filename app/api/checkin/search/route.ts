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
  query?: string;
  mode?: "ticket" | "text" | "all";
  filter?: "all" | "student" | "company";
};

export async function POST(request: Request) {
  const isAdmin = await requireAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as Body | null;
  const eventId = body?.eventId?.trim();
  const query = body?.query?.trim();
  const filter = body?.filter ?? "all";

  if (!eventId) {
    return NextResponse.json({ error: "Event er påkrevd." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  if (body?.mode === "all") {
    let allQuery = supabase
      .from("event_tickets")
      .select("*, student:students(id, full_name, email, phone, study_program, study_level, study_year), company:companies(id, name)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (filter === "student") {
      allQuery = allQuery.not("student_id", "is", null);
    }
    if (filter === "company") {
      allQuery = allQuery.not("company_id", "is", null);
    }
    const { data, error } = await allQuery;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ results: data ?? [] });
  }

  if (body?.mode === "ticket") {
    if (!query) {
      return NextResponse.json({ error: "Ticketnummer mangler." }, { status: 400 });
    }
    let ticketQuery = supabase
      .from("event_tickets")
      .select("*, student:students(id, full_name, email, phone, study_program, study_level, study_year), company:companies(id, name)")
      .eq("event_id", eventId)
      .eq("ticket_number", query)
      .limit(20);
    if (filter === "student") {
      ticketQuery = ticketQuery.not("student_id", "is", null);
    }
    if (filter === "company") {
      ticketQuery = ticketQuery.not("company_id", "is", null);
    }
    const { data, error } = await ticketQuery;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ results: data ?? [] });
  }

  if (!query) {
    return NextResponse.json({ error: "Søketekst mangler." }, { status: 400 });
  }

  const studentPromise =
    filter === "company"
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from("students")
          .select("id, full_name, email, phone, study_program, study_level, study_year")
          .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
          .limit(50);

  let attendeeQuery = supabase
    .from("event_tickets")
    .select("*, company:companies(id, name)")
    .eq("event_id", eventId)
    .or(`attendee_name.ilike.%${query}%,attendee_email.ilike.%${query}%,attendee_phone.ilike.%${query}%`)
    .limit(100);
  if (filter === "student") {
    attendeeQuery = attendeeQuery.not("student_id", "is", null);
  }
  if (filter === "company") {
    attendeeQuery = attendeeQuery.not("company_id", "is", null);
  }

  const [{ data: students, error: studentError }, { data: ticketAttendees, error: attendeeError }] =
    await Promise.all([studentPromise, attendeeQuery]);

  if (studentError) return NextResponse.json({ error: studentError.message }, { status: 500 });
  if (attendeeError) return NextResponse.json({ error: attendeeError.message }, { status: 500 });

  const studentIds = (students ?? []).map((student) => student.id);
  const { data: ticketsByStudent, error: ticketError } = studentIds.length
    ? await supabase
        .from("event_tickets")
        .select("*, company:companies(id, name)")
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
