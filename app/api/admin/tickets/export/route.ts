import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return profile?.role === "admin";
}

export async function GET(request: Request) {
  const isAdmin = await requireAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: "eventId mangler" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { data: tickets, error } = await supabase
    .from("event_tickets")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const studentIds = (tickets ?? []).map((ticket) => ticket.student_id).filter(Boolean) as string[];
  const { data: students } = studentIds.length
    ? await supabase
        .from("students")
        .select("id, full_name, email, phone, study_program, study_level, study_year")
        .in("id", studentIds)
    : { data: [] };
  const studentMap = new Map((students ?? []).map((student) => [student.id, student]));

  const rows = (tickets ?? []).map((ticket) => {
    const student = ticket.student_id ? studentMap.get(ticket.student_id) : null;
    const name = student?.full_name ?? ticket.attendee_name ?? "";
    const email = student?.email ?? ticket.attendee_email ?? "";
    const phone = student?.phone ?? ticket.attendee_phone ?? "";
    const study = student?.study_program ?? "";
    const level = student?.study_level ?? "";
    const year = student?.study_year ? `${student.study_year}. år` : "";

    return {
      ticket_number: ticket.ticket_number,
      status: ticket.status,
      checked_in_at: ticket.checked_in_at ?? "",
      full_name: name,
      email,
      phone,
      study_program: study,
      study_year_text: [year, level].filter(Boolean).join(" "),
      attendee_source: ticket.student_id ? "student" : ticket.company_id ? "company" : "guest",
      created_at: ticket.created_at,
    };
  });

  const csv = toCsv(rows);
  const filename = `tickets-${eventId}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  });
}
