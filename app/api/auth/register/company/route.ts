import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase/route";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getBaseUrlForRole } from "@/lib/auth-urls";
import { companyRegistrationSchema } from "@/lib/validation/auth";
import {
  normalizeEmailAddress,
  validateHostRoleLock,
} from "@/lib/auth-registration";
import {
  ensureCompanyAccessRequest,
  uploadCompanyLogo,
} from "@/lib/company-access";

export async function POST(request: Request) {
  const hostValidationError = validateHostRoleLock(request.headers.get("host"), "company");
  if (hostValidationError) {
    return NextResponse.json({ error: hostValidationError }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Fant ikke registreringsdata." }, { status: 400 });
  }

  const parsed = companyRegistrationSchema.safeParse({
    email: formData.get("email"),
    companyName: formData.get("companyName"),
    orgNumber: String(formData.get("orgNumber") ?? "").replace(/\s+/g, ""),
    address: formData.get("address"),
    postalCode: formData.get("postalCode"),
    city: formData.get("city"),
    country: formData.get("country"),
    recruitmentFields: formData.getAll("recruitmentFields"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join(" ");
    return NextResponse.json({ error: message || "Ugyldig registreringsdata." }, { status: 400 });
  }

  const supabase = createRouteSupabaseClient();
  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const normalizedEmail = normalizeEmailAddress(parsed.data.email);
  const baseUrl = getBaseUrlForRole("company", new URL(request.url).origin);
  const logoFile = formData.get("logo");
  let createdUserId: string | null = null;
  let logoPath: string | null = null;

  try {
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${baseUrl}/auth/callback?role=company&mode=verify&next=%2Fcompany`,
      },
    });

    if (error) {
      return NextResponse.json(
        { error: "Kunne ikke opprette bedriftskonto. Sjekk e-post og prøv igjen." },
        { status: 400 },
      );
    }

    if (!data.user?.id) {
      return NextResponse.json({ error: "Mangler brukerdata fra Auth." }, { status: 500 });
    }

    createdUserId = data.user.id;

    if (logoFile instanceof File && logoFile.size > 0) {
      if (!logoFile.type.startsWith("image/")) {
        return NextResponse.json({ error: "Logo må være et bildefilformat." }, { status: 400 });
      }
      if (logoFile.size > 6 * 1024 * 1024) {
        return NextResponse.json({ error: "Logo må være 6 MB eller mindre." }, { status: 400 });
      }

      logoPath = await uploadCompanyLogo({
        userId: data.user.id,
        file: logoFile,
        orgNumber: parsed.data.orgNumber,
      });
    }

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: data.user.id,
        role: "company",
        full_name: parsed.data.companyName,
        created_at: now,
        updated_at: now,
      },
      { onConflict: "id" },
    );
    if (profileError) throw profileError;

    await ensureCompanyAccessRequest({
      userId: data.user.id,
      email: normalizedEmail,
      orgNumber: parsed.data.orgNumber,
      companyName: parsed.data.companyName,
      address: parsed.data.address,
      postalCode: parsed.data.postalCode,
      city: parsed.data.city,
      country: parsed.data.country,
      logoPath,
      recruitmentFields: parsed.data.recruitmentFields,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (logoPath) {
      await admin.storage.from("event-registration-assets").remove([logoPath]).catch(() => undefined);
    }
    if (createdUserId) {
      await admin.auth.admin.deleteUser(createdUserId).catch(() => undefined);
    }

    const message = error instanceof Error ? error.message : "Ukjent feil";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
