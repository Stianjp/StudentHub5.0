"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { consentSchema, kioskSurveySchema } from "@/lib/validation/student";
import {
  getOrCreateStudentForUser,
  recordStandVisit,
  submitKioskSurvey,
} from "@/lib/student";
import { createLead, upsertConsentForStudent } from "@/lib/lead";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/resend";
import type { TableRow } from "@/lib/types/database";

export async function submitStandFlow(formData: FormData) {
  const profile = await requireRole("student");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");

  const student = await getOrCreateStudentForUser(profile.id, user.email);

  const parsed = consentSchema.safeParse({
    eventId: formData.get("eventId"),
    companyId: formData.get("companyId"),
    consent: formData.get("consent"),
    scope: formData.get("scope") ?? "contact",
    answers: {
      motivation: formData.get("motivation")?.toString(),
      timing: formData.get("timing")?.toString(),
      skills: formData.get("skills")?.toString(),
    },
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  if (!parsed.data.eventId) {
    throw new Error("Event mangler.");
  }

  await recordStandVisit({
    eventId: parsed.data.eventId,
    companyId: parsed.data.companyId,
    studentId: student.id,
    source: "qr",
    metadata: { flow: "stand" },
  });

  await upsertConsentForStudent({
    studentId: student.id,
    companyId: parsed.data.companyId,
    eventId: parsed.data.eventId ?? null,
    consentGiven: parsed.data.consent,
    source: "stand",
  });

  await createLead({
    student,
    companyId: parsed.data.companyId,
    eventId: parsed.data.eventId ?? null,
    interests: Object.values(parsed.data.answers ?? {}).filter(Boolean) as string[],
    jobTypes: student.job_types ?? [],
    studyLevel: student.study_level,
    studyYear: student.study_year ?? student.graduation_year,
    fieldOfStudy: student.study_program,
    consentGiven: parsed.data.consent,
    source: "stand",
  });

  if (parsed.data.answers && Object.keys(parsed.data.answers).length > 0) {
    const supabase = await createServerSupabaseClient();
    await supabase.from("survey_responses").insert({
      event_id: parsed.data.eventId,
      company_id: parsed.data.companyId,
      student_id: student.id,
      answers: parsed.data.answers,
      created_at: new Date().toISOString(),
    });
  }

  revalidatePath(`/event/${parsed.data.eventId}/company/${parsed.data.companyId}`);
  revalidatePath("/student/consents");
}

function generateTicketNumber() {
  return `T-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

async function ensureCapacity(supabase: ReturnType<typeof createAdminSupabaseClient>, eventId: string) {
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("ticket_limit")
    .eq("id", eventId)
    .single();
  if (eventError) throw eventError;
  if (!event?.ticket_limit) return;

  const { count, error: countError } = await supabase
    .from("event_tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);
  if (countError) throw countError;

  if ((count ?? 0) >= event.ticket_limit) {
    throw new Error("Det er ikke flere billetter igjen for dette eventet.");
  }
}

async function createTicketNumber(supabase: ReturnType<typeof createAdminSupabaseClient>, eventId: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const ticketNumber = generateTicketNumber();
    const { data, error } = await supabase
      .from("event_tickets")
      .insert({
        event_id: eventId,
        ticket_number: ticketNumber,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (!error) return data;
    if (error.code !== "23505") throw error;
  }
  throw new Error("Kunne ikke generere billettnummer.");
}

export async function registerStudentForEvent(formData: FormData) {
  const profile = await requireRole("student");
  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");

  const eventId = String(formData.get("eventId") ?? "").trim();
  if (!eventId) throw new Error("Event mangler.");

  const student = await getOrCreateStudentForUser(profile.id, user.email);
  const phone = String(formData.get("phone") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const emailInput = String(formData.get("email") ?? "").trim();
  const missingName = !student.full_name && !fullName;
  const missingEmail = !student.email && !emailInput && !user.email;
  const missingPhone = !student.phone && !phone;
  if (missingName || missingEmail || missingPhone) {
    throw new Error("Navn, e-post og telefonnummer må være registrert for å hente billett.");
  }
  const requireCompany = String(formData.get("requireCompany") ?? "") === "1";

  await ensureCapacity(admin, eventId);
  const ticket = await createTicketNumber(admin, eventId);
  const now = new Date().toISOString();
  const { error: attachError } = await admin
    .from("event_tickets")
    .update({
      student_id: student.id,
      attendee_name: student.full_name ?? fullName ?? null,
      attendee_email: student.email ?? emailInput ?? user.email ?? null,
      attendee_phone: phone || student.phone || null,
      updated_at: now,
    })
    .eq("id", ticket.id);

  if (attachError) throw attachError;

  const studentUpdate: Record<string, string> = {};
  if (phone && phone !== student.phone) studentUpdate.phone = phone;
  if (fullName && fullName !== student.full_name) studentUpdate.full_name = fullName;
  if (emailInput && emailInput !== student.email) studentUpdate.email = emailInput;
  if (Object.keys(studentUpdate).length > 0) {
    await admin.from("students").update({ ...studentUpdate, updated_at: now }).eq("id", student.id);
  }

  const { data: event } = await admin.from("events").select("id, name").eq("id", eventId).single();

  if (user.email) {
    const ticketPayload = encodeURIComponent(JSON.stringify({ t: ticket.ticket_number, e: eventId }));
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${ticketPayload}`;
    await sendTransactionalEmail({
      to: user.email,
      subject: `Billett til ${event?.name ?? "OSH event"}`,
      type: "event_confirmation",
      html: `<p>Hei,</p>
<p>Du er påmeldt ${event?.name ?? "eventet"}.</p>
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
  }

  const companyIds = formData.getAll("companyIds").map((value) => String(value)).filter(Boolean);
  if (requireCompany && companyIds.length === 0) {
    throw new Error("Velg minst én bedrift for å hente billett.");
  }
  if (companyIds.length > 0) {
    await Promise.all(
      companyIds.map(async (companyId) => {
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

  revalidatePath("/student");
  revalidatePath(`/event/events/${eventId}`);
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  if (returnTo) {
    redirect(returnTo);
  }
}

export async function registerAttendeeForEvent(formData: FormData) {
  const supabase = createAdminSupabaseClient();
  const eventId = String(formData.get("eventId") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const companyIds = formData.getAll("companyIds").map((value) => String(value)).filter(Boolean);
  const requireCompany = String(formData.get("requireCompany") ?? "") === "1";

  if (!eventId || !fullName || !email || !phone) {
    throw new Error("Navn, e-post og telefon er påkrevd.");
  }
  if (requireCompany && companyIds.length === 0) {
    throw new Error("Velg minst én bedrift for å hente billett.");
  }

  await ensureCapacity(supabase, eventId);
  const ticket = await createTicketNumber(supabase, eventId);
  const now = new Date().toISOString();

  const { data: matchedStudent } = await supabase
    .from("students")
    .select("id, email, full_name, phone, study_program, study_level, study_year, graduation_year, interests, job_types")
    .eq("email", email)
    .maybeSingle();

  const { error: attachError } = await supabase
    .from("event_tickets")
    .update({
      student_id: matchedStudent?.id ?? null,
      attendee_name: fullName,
      attendee_email: email,
      attendee_phone: phone || null,
      updated_at: now,
    })
    .eq("id", ticket.id);

  if (attachError) throw attachError;

  if (matchedStudent) {
    const { data: fullStudent } = await supabase
      .from("students")
      .select("*")
      .eq("id", matchedStudent.id)
      .maybeSingle();
    const leadStudent = (fullStudent ?? null) as TableRow<"students"> | null;

    await supabase
      .from("students")
      .update({
        full_name: matchedStudent.full_name ?? fullName,
        phone: matchedStudent.phone ?? phone,
        updated_at: now,
      })
      .eq("id", matchedStudent.id);

    if (companyIds.length > 0 && leadStudent) {
      await Promise.all(
        companyIds.map(async (companyId) => {
          await upsertConsentForStudent({
            studentId: matchedStudent.id,
            companyId,
            eventId,
            consentGiven: true,
            source: "ticket",
          });
          await createLead({
            student: leadStudent,
            companyId,
            eventId,
            interests: leadStudent.interests ?? [],
            jobTypes: leadStudent.job_types ?? [],
            studyLevel: leadStudent.study_level,
            studyYear: leadStudent.study_year ?? leadStudent.graduation_year,
            fieldOfStudy: leadStudent.study_program,
            consentGiven: true,
            source: "ticket",
          });
        }),
      );
    }
  }

  const { data: event } = await supabase.from("events").select("id, name").eq("id", eventId).single();
  const ticketPayload = encodeURIComponent(JSON.stringify({ t: ticket.ticket_number, e: eventId }));
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${ticketPayload}`;

  await sendTransactionalEmail({
    to: email,
    subject: `Billett til ${event?.name ?? "OSH event"}`,
    type: "event_confirmation",
    html: `<p>Hei ${fullName},</p>
<p>Du er påmeldt ${event?.name ?? "eventet"}.</p>
<p>Billettnummer: <strong>${ticket.ticket_number}</strong></p>
<p>Vis denne QR-koden i check-in:</p>
<p><img src="${qrUrl}" alt="QR-kode" /></p>`,
    payload: {
      eventId,
      ticketNumber: ticket.ticket_number,
      ticketId: ticket.id,
    },
    supabase,
  });

  revalidatePath(`/event/events/${eventId}`);
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  if (returnTo) {
    redirect(returnTo);
  }
}

export async function submitKiosk(formData: FormData) {
  const parsed = kioskSurveySchema.safeParse({
    eventId: formData.get("eventId"),
    studyProgram: formData.get("studyProgram"),
    studyLevel: formData.get("studyLevel"),
    jobTypes: formData.get("jobTypes"),
    interests: formData.get("interests"),
    values: formData.get("values"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  await submitKioskSurvey({
    eventId: parsed.data.eventId,
    answers: {
      studyProgram: parsed.data.studyProgram,
      studyLevel: parsed.data.studyLevel,
      jobTypes: parsed.data.jobTypes,
      interests: parsed.data.interests,
      values: parsed.data.values,
    },
  });

  await recordStandVisit({
    eventId: parsed.data.eventId,
    companyId: formData.get("companyId")?.toString() ?? null,
    studentId: null,
    source: "kiosk",
    metadata: { flow: "kiosk" },
  });

  revalidatePath(`/event/${parsed.data.eventId}/kiosk`);
}
