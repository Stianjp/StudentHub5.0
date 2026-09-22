import { NextResponse } from "next/server";
import { getSafePortalNextPath, isStudentOnboardingComplete, resolveOAuthPortalRole } from "@/lib/auth-oauth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { reconcileApprovedCompanyPortalInvites } from "@/lib/event-registration";

type FinalizeBody = {
  next?: string | null;
  role?: string | null;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as FinalizeBody;
  const role = resolveOAuthPortalRole(request.headers.get("host"), body.role);
  if (!role) {
    return NextResponse.json({ error: "Google sign-in is only available in the student and company portals." }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user?.email) {
    return NextResponse.json({ error: "The Google session could not be verified. Try signing in again." }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const normalizedEmail = user.email.trim().toLowerCase();
  const now = new Date().toISOString();
  const safeNext = getSafePortalNextPath(body.next, role);

  const { data: existingProfile, error: profileReadError } = await admin
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (profileReadError) {
    return NextResponse.json({ error: "The portal profile could not be checked." }, { status: 500 });
  }

  if (existingProfile && existingProfile.role !== role) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "This Google account already belongs to the other Oslo Student Hub portal." },
      { status: 403 },
    );
  }

  if (!existingProfile) {
    const fullName = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").trim() || null;
    const { error: insertError } = await admin.from("profiles").insert({
      id: user.id,
      role,
      full_name: fullName,
      created_at: now,
      updated_at: now,
    });
    if (insertError) {
      const { data: racedProfile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (!racedProfile || racedProfile.role !== role) {
        await supabase.auth.signOut();
        return NextResponse.json({ error: "The portal profile could not be created safely." }, { status: 409 });
      }
    }
  }

  if (role === "student") {
    const { data: byUser, error: byUserError } = await admin
      .from("students")
      .select("id, user_id, full_name, school, study_program, study_level, study_year")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byUserError) {
      return NextResponse.json({ error: "The student profile could not be checked." }, { status: 500 });
    }

    let student = byUser;
    if (!student) {
      const { data: byEmail, error: byEmailError } = await admin
        .from("students")
        .select("id, user_id, full_name, school, study_program, study_level, study_year")
        .eq("email", normalizedEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (byEmailError) {
        return NextResponse.json({ error: "The student profile could not be checked." }, { status: 500 });
      }
      if (byEmail && (!byEmail.user_id || byEmail.user_id === user.id)) {
        const { data: linked, error: linkError } = await admin
          .from("students")
          .update({ user_id: user.id, updated_at: now })
          .eq("id", byEmail.id)
          .select("id, user_id, full_name, school, study_program, study_level, study_year")
          .single();
        if (linkError) {
          return NextResponse.json({ error: "The existing student profile could not be connected." }, { status: 500 });
        }
        student = linked;
      }
    }

    return NextResponse.json({
      destination: isStudentOnboardingComplete(student)
        ? safeNext
        : "/auth/onboarding/student",
    });
  }

  try {
    await reconcileApprovedCompanyPortalInvites(user.id, normalizedEmail);
  } catch {
    return NextResponse.json({ error: "An existing company invitation could not be connected." }, { status: 500 });
  }

  const [membershipResult, accessRequestResult] = await Promise.all([
    admin
      .from("company_users")
      .select("id")
      .eq("user_id", user.id)
      .not("approved_at", "is", null)
      .limit(1)
      .maybeSingle(),
    admin
      .from("company_user_requests")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (membershipResult.error || accessRequestResult.error) {
    return NextResponse.json({ error: "Company access could not be checked." }, { status: 500 });
  }

  return NextResponse.json({
    destination: membershipResult.data || accessRequestResult.data ? safeNext : "/auth/onboarding/company",
  });
}
