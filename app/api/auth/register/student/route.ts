import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase/route";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getBaseUrlForRole } from "@/lib/auth-urls";
import { studentRegistrationSchema } from "@/lib/validation/auth";
import {
  normalizeEmailAddress,
  validateHostRoleLock,
} from "@/lib/auth-registration";

export async function POST(request: Request) {
  const hostValidationError = validateHostRoleLock(request.headers.get("host"), "student");
  if (hostValidationError) {
    return NextResponse.json({ error: hostValidationError }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = studentRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join(" ");
    return NextResponse.json({ error: message || "Ugyldig registreringsdata." }, { status: 400 });
  }

  const supabase = createRouteSupabaseClient();
  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const normalizedEmail = normalizeEmailAddress(parsed.data.email);
  const baseUrl = getBaseUrlForRole("student", new URL(request.url).origin);
  let createdUserId: string | null = null;

  try {
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${baseUrl}/auth/callback?role=student&mode=verify&next=%2Fstudent%2Fdashboard`,
      },
    });

    if (error) {
      return NextResponse.json(
        { error: "Kunne ikke opprette studentkonto. Sjekk e-post og prøv igjen." },
        { status: 400 },
      );
    }

    if (!data.user?.id) {
      return NextResponse.json({ error: "Mangler brukerdata fra Auth." }, { status: 500 });
    }

    createdUserId = data.user.id;

    const profilePayload = {
      id: data.user.id,
      role: "student" as const,
      full_name: parsed.data.fullName,
      created_at: now,
      updated_at: now,
    };

    const { error: profileError } = await admin
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" });
    if (profileError) throw profileError;

    const { data: studentByUser, error: studentByUserError } = await admin
      .from("students")
      .select("id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (studentByUserError) throw studentByUserError;

    const studentPayload = {
      user_id: data.user.id,
      full_name: parsed.data.fullName,
      email: normalizedEmail,
      school: parsed.data.school,
      study_program: parsed.data.studyProgram,
      study_year: parsed.data.studyYear,
      job_types: parsed.data.jobTypes,
      updated_at: now,
    };

    if (studentByUser?.id) {
      const { error: updateError } = await admin
        .from("students")
        .update(studentPayload)
        .eq("id", studentByUser.id);
      if (updateError) throw updateError;
    } else {
      const { data: studentByEmail, error: studentByEmailError } = await admin
        .from("students")
        .select("id")
        .eq("email", normalizedEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (studentByEmailError) throw studentByEmailError;

      if (studentByEmail?.id) {
        const { error: updateError } = await admin
          .from("students")
          .update(studentPayload)
          .eq("id", studentByEmail.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await admin.from("students").insert({
          ...studentPayload,
          created_at: now,
          interests: [],
          values: [],
          preferred_locations: [],
          willing_to_relocate: false,
          liked_company_ids: [],
        });
        if (insertError) throw insertError;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (createdUserId) {
      await admin.auth.admin.deleteUser(createdUserId).catch(() => undefined);
    }

    const message = error instanceof Error ? error.message : "Ukjent feil";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
