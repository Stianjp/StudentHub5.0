import { NextResponse } from "next/server";
import { magicLinkSchema } from "@/lib/validation/company";
import { createRouteSupabaseClient } from "@/lib/supabase/route";
import { getBaseUrlForRole, getDefaultNextPath } from "@/lib/auth-urls";
import { validateMagicLinkRoleForHost } from "@/lib/auth-registration";

export async function POST(request: Request) {
  const supabase = createRouteSupabaseClient();
  const body = await request.json().catch(() => null);
  const parsed = magicLinkSchema.safeParse(body);

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join(", ");
    return NextResponse.json({ error: message || "Invalid input" }, { status: 400 });
  }

  const { email, role, next } = parsed.data;
  if (role === "admin") {
    return NextResponse.json({ error: "Admin access can only be created by OSH." }, { status: 403 });
  }

  const hostValidationError = validateMagicLinkRoleForHost(request.headers.get("host"), role);
  if (hostValidationError) {
    return NextResponse.json({ error: hostValidationError }, { status: 403 });
  }

  const url = new URL(request.url);
  const nextPath =
    typeof next === "string" && next.startsWith("/") ? next : getDefaultNextPath(role);
  const baseUrl = getBaseUrlForRole(role, url.origin);
  const redirectTo = `${baseUrl}/auth/callback?role=${role}&next=${encodeURIComponent(nextPath)}`;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
