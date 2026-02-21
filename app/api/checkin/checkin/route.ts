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
  ticketId: string;
};

export async function POST(request: Request) {
  const isAdmin = await requireAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as Body | null;
  const eventId = body?.eventId?.trim();
  const ticketId = body?.ticketId?.trim();
  const printAgentUrl = process.env.PRINT_AGENT_URL?.trim();

  if (!eventId || !ticketId) {
    return NextResponse.json({ error: "Event og ticket mangler." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { data: currentTicket, error: currentTicketError } = await supabase
    .from("event_tickets")
    .select("*")
    .eq("id", ticketId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (currentTicketError) return NextResponse.json({ error: currentTicketError.message }, { status: 500 });
  if (!currentTicket) return NextResponse.json({ error: "Ticket ble ikke funnet." }, { status: 404 });

  const shouldUndoCheckin = Boolean(currentTicket.checked_in_at);

  const { data: ticket, error } = await supabase
    .from("event_tickets")
    .update({
      checked_in_at: shouldUndoCheckin ? null : now,
      status: shouldUndoCheckin ? "active" : "checked_in",
      updated_at: now,
    })
    .eq("id", ticketId)
    .eq("event_id", eventId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let student: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    study_program: string | null;
    study_level: string | null;
    study_year: number | null;
  } | null = null;
  if (ticket?.student_id) {
    const { data: studentRow } = await supabase
      .from("students")
      .select("full_name, email, phone, study_program, study_level, study_year")
      .eq("id", ticket.student_id)
      .maybeSingle();
    student = studentRow ?? null;
  }

  const name = student?.full_name ?? ticket.attendee_name ?? "";
  const email = student?.email ?? ticket.attendee_email ?? "";
  const phone = student?.phone ?? ticket.attendee_phone ?? "";
  const companyName = ticket.company_id
    ? (await supabase.from("companies").select("name").eq("id", ticket.company_id).maybeSingle()).data?.name ?? ""
    : "";

  const isCompanyTicket = Boolean(ticket.company_id);
  const printPayload = {
    type: isCompanyTicket ? "company" : "student",
    fullName: name,
    studyProgram: student?.study_program ?? "",
    university: "",
    position: "",
    companyName: companyName,
  };

  let printJob: { jobId?: string; status?: string; error?: string } | null = null;
  if (printAgentUrl && !shouldUndoCheckin) {
    try {
      const response = await fetch(printAgentUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(printPayload),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        printJob = { status: "failed", error: payload?.error ?? "Print-agent feilet." };
      } else {
        printJob = { jobId: payload?.jobId, status: payload?.status ?? "queued" };
      }
    } catch (error) {
      printJob = { status: "failed", error: error instanceof Error ? error.message : "Ukjent print-feil." };
    }
  }

  return NextResponse.json({
    ok: true,
    action: shouldUndoCheckin ? "reverted" : "checked_in",
    ticket,
    print: shouldUndoCheckin ? null : { payload: printPayload, job: printJob },
  });
}
