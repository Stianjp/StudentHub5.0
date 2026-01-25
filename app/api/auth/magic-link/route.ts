import { NextResponse } from "next/server";
import { magicLinkSchema } from "@/lib/validation/company";
import { createRouteSupabaseClient } from "@/lib/supabase/route";

const roleNextPath: Record<"student" | "company" | "admin", string> = {
  student: "/student",
  company: "/company",
  admin: "/admin",
};

export async function POST(request: Request) {
  const supabase = createRouteSupabaseClient();
  const body = await request.json().catch(() => null);
  const parsed = magicLinkSchema.safeParse(body);

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join(", ");
    return NextResponse.json({ error: message || "Ugyldig input" }, { status: 400 });
  }

  const { email, role, next } = parsed.data;
  const url = new URL(request.url);
  const nextPath =
    typeof next === "string" && next.startsWith("/") ? next : roleNextPath[role];
  const redirectTo = `${url.origin}/auth/callback?role=${role}&next=${encodeURIComponent(nextPath)}`;

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
