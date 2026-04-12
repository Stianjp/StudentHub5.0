import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createRouteSupabaseClient } from "@/lib/supabase/route";
import { getBaseUrlForRole } from "@/lib/auth-urls";
import { createLead, filterExistingCompanyIds, upsertConsentForStudent } from "@/lib/lead";
import { sendTransactionalEmail } from "@/lib/resend";
import { normalizeEmailAddress, validatePasswordStrength } from "@/lib/auth-registration";
import { studentProfileSchema } from "@/lib/validation/student";
import type { TableRow } from "@/lib/types/database";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

type EventTicket = TableRow<"event_tickets">;
type StudentRow = TableRow<"students">;

function generateTicketNumber() {
  return `T-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

async function ensureCapacity(eventId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, ticket_limit")
    .eq("id", eventId)
    .single();
  if (eventError) throw eventError;
  if (!event?.ticket_limit) return;

  const { count, error: countError } = await supabase
    .from("event_tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id" as never, eventId as never);
  if (countError) throw countError;

  if ((count ?? 0) >= event.ticket_limit) {
    throw new Error("Det er ikke flere billetter igjen for dette eventet.");
  }
}

async function getStudentTicketForEvent(eventId: string, studentId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("event_tickets")
    .select("*")
    .eq("event_id", eventId)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return (data?.[0] ?? null) as EventTicket | null;
}

async function createTicket(payload: {
  eventId: string;
  studentId: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string | null;
}) {
  const supabase = createAdminSupabaseClient();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const ticketNumber = generateTicketNumber();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("event_tickets")
      .insert({
        event_id: payload.eventId,
        student_id: payload.studentId,
        attendee_name: payload.attendeeName,
        attendee_email: payload.attendeeEmail,
        attendee_phone: payload.attendeePhone ?? null,
        ticket_number: ticketNumber,
        status: "active",
        updated_at: now,
      })
      .select("*")
      .single();

    if (!error) return data as EventTicket;

    const message = `${error.message} ${error.details ?? ""}`.toLowerCase();
    if (error.code === "23505" && message.includes("ticket_number")) {
      continue;
    }

    if (
      error.code === "23505" &&
      (message.includes("idx_event_tickets_unique_student_event") ||
        (message.includes("event_id") && message.includes("student_id")))
    ) {
      const existingTicket = await getStudentTicketForEvent(payload.eventId, payload.studentId);
      if (existingTicket) return existingTicket;
    }

    throw error;
  }

  throw new Error("Kunne ikke generere billettnummer.");
}

export async function POST(request: Request, context: RouteContext) {
  const { eventId } = await context.params;
  const admin = createAdminSupabaseClient();
  const routeSupabase = createRouteSupabaseClient();
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { message: "Ugyldig forespørsel.", details: "Skjemaet kunne ikke leses." },
      { status: 400 },
    );
  }

  const createAccount = Boolean(body.createAccount);
  const password = String(body.password ?? "");
  const confirmPassword = String(body.confirmPassword ?? "");
  const willingToRelocate = Boolean(body.willingToRelocate);
  const preferredLocations = willingToRelocate ? [] : Array.isArray(body.preferredLocations) ? body.preferredLocations : [];

  const parsed = studentProfileSchema.safeParse({
    fullName: body.fullName,
    email: body.email,
    phone: body.phone,
    school: body.school,
    studyProgram: body.studyProgram,
    studyLevel: body.studyLevel,
    studyYear: body.studyYear,
    jobTypes: Array.isArray(body.jobTypes) ? body.jobTypes.join(",") : "",
    interests: Array.isArray(body.interests) ? body.interests : [],
    values: Array.isArray(body.values) ? body.values.join(",") : "",
    preferredLocations: preferredLocations.join(","),
    willingToRelocate,
    likedCompanyIds: Array.isArray(body.likedCompanyIds) ? body.likedCompanyIds.join(",") : "",
    about: body.about,
    workStyle: body.workStyle,
    socialProfile: body.socialProfile,
    teamSize: body.teamSize,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Sjekk feltene i skjemaet.",
        details: parsed.error.issues.map((issue) => issue.message).join(" "),
      },
      { status: 400 },
    );
  }

  if (createAccount) {
    const passwordError = validatePasswordStrength(password, confirmPassword);
    if (passwordError) {
      return NextResponse.json(
        { message: "Passordet må oppdateres.", details: passwordError },
        { status: 400 },
      );
    }
  }

  const normalizedEmail = normalizeEmailAddress(parsed.data.email);
  const now = new Date().toISOString();
  let createdUserId: string | null = null;

  try {
    const { data: event } = await admin.from("events").select("id, name").eq("id", eventId).single();
    if (!event) {
      return NextResponse.json(
        { message: "Eventet ble ikke funnet.", details: "Prøv å åpne siden på nytt." },
        { status: 404 },
      );
    }

    const { data: existingStudent } = await admin
      .from("students")
      .select("*")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let accountStatus: "created" | "existing" | "skipped" = "skipped";
    let userId = existingStudent?.user_id ?? null;

    if (createAccount) {
      if (userId) {
        accountStatus = "existing";
      } else {
        const baseUrl = getBaseUrlForRole("student", new URL(request.url).origin);
        const signUpResponse = await routeSupabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${baseUrl}/auth/callback?role=student&mode=verify&next=%2Fstudent%2Fdashboard`,
          },
        });

        if (signUpResponse.error) {
          accountStatus = "existing";
        } else if (signUpResponse.data.user?.id) {
          userId = signUpResponse.data.user.id;
          createdUserId = signUpResponse.data.user.id;
          accountStatus = "created";

          const { error: profileError } = await admin.from("profiles").upsert(
            {
              id: userId,
              role: "student",
              full_name: parsed.data.fullName,
              created_at: now,
              updated_at: now,
            },
            { onConflict: "id" },
          );
          if (profileError) throw profileError;
        }
      }
    }

    const validCompanyIds = await filterExistingCompanyIds(parsed.data.likedCompanyIds);

    let student: StudentRow | null = existingStudent as StudentRow | null;
    const studentPayload = {
      user_id: userId,
      full_name: parsed.data.fullName,
      email: normalizedEmail,
      phone: parsed.data.phone || null,
      school: parsed.data.school,
      study_program: parsed.data.studyProgram,
      study_level: parsed.data.studyLevel,
      study_year: parsed.data.studyYear,
      job_types: parsed.data.jobTypes,
      interests: parsed.data.interests,
      values: parsed.data.values,
      preferred_locations: parsed.data.preferredLocations,
      willing_to_relocate: parsed.data.willingToRelocate,
      liked_company_ids: validCompanyIds,
      about: parsed.data.about || null,
      work_style: parsed.data.workStyle || null,
      social_profile: parsed.data.socialProfile || null,
      team_size: parsed.data.teamSize || null,
      updated_at: now,
    };

    if (student?.id) {
      const { data: updatedStudent, error: updateError } = await admin
        .from("students")
        .update(studentPayload)
        .eq("id", student.id)
        .select("*")
        .single();
      if (updateError) throw updateError;
      student = updatedStudent as StudentRow;
    } else {
      const { data: insertedStudent, error: insertError } = await admin
        .from("students")
        .insert({
          ...studentPayload,
          created_at: now,
        })
        .select("*")
        .single();
      if (insertError) throw insertError;
      student = insertedStudent as StudentRow;
    }

    if (!student?.id) {
      throw new Error("Kunne ikke lagre studentprofilen.");
    }

    const existingTicket = await getStudentTicketForEvent(eventId, student.id);
    if (existingTicket) {
      return NextResponse.json(
        {
          message: "Du er allerede registrert.",
          details: "Vi fant allerede en billett knyttet til denne studenten og dette eventet.",
        },
        { status: 409 },
      );
    }

    await ensureCapacity(eventId);
    const ticket = await createTicket({
      eventId,
      studentId: student.id,
      attendeeName: parsed.data.fullName,
      attendeeEmail: normalizedEmail,
      attendeePhone: parsed.data.phone || null,
    });

    if (validCompanyIds.length > 0) {
      await Promise.all(
        validCompanyIds.map(async (companyId) => {
          await upsertConsentForStudent({
            studentId: student.id,
            companyId,
            eventId,
            consentGiven: true,
            source: "ticket",
          });
          await createLead({
            student,
            companyId,
            eventId,
            interests: student.interests ?? [],
            jobTypes: student.job_types ?? [],
            studyLevel: student.study_level,
            studyYear: student.study_year ?? student.graduation_year,
            fieldOfStudy: student.study_program,
            consentGiven: true,
            source: "ticket",
          });
        }),
      );
    }

    const ticketPayload = encodeURIComponent(ticket.ticket_number);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${ticketPayload}`;

    await sendTransactionalEmail({
      to: normalizedEmail,
      subject: `Billett til ${event.name ?? "OSH event"}`,
      type: "event_confirmation",
      html: `<p>Hei ${parsed.data.fullName},</p>
<p>Du er påmeldt ${event.name ?? "eventet"}.</p>
<p>Billettnummer: <strong>${ticket.ticket_number}</strong></p>
<p>Vis denne QR-koden i check-in:</p>
<p><img src="${qrUrl}" alt="QR-kode" /></p>`,
      payload: {
        eventId,
        ticketNumber: ticket.ticket_number,
        ticketId: ticket.id,
      },
      supabase: admin,
    });

    const details =
      accountStatus === "created"
        ? "Billetten er sendt på e-post. Vi har også sendt en e-post for å bekrefte kontoen din."
        : accountStatus === "existing"
          ? "Billetten er sendt på e-post. Hvis du allerede har konto hos oss, kan du logge inn på studentsiden med samme e-post."
          : "Billetten er sendt på e-post.";

    return NextResponse.json({
      message: "Registreringen er fullført.",
      details,
    });
  } catch (error) {
    if (createdUserId) {
      await admin.auth.admin.deleteUser(createdUserId).catch(() => undefined);
    }

    const details = error instanceof Error ? error.message : "Ukjent feil";
    return NextResponse.json(
      { message: "Kunne ikke fullføre registreringen.", details },
      { status: 500 },
    );
  }
}
