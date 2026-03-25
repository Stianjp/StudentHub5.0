import { NextResponse } from "next/server";
import { syncContactOverviewMailbox } from "@/lib/email-contact-overview";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id" as never, user.id as never)
    .maybeSingle();

  return (profile as { role?: string } | null)?.role === "admin";
}

function hasValidCronSecret(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const authorization = request.headers.get("authorization") ?? "";
  return authorization === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  const allowed = hasValidCronSecret(request) || (await requireAdmin());
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await syncContactOverviewMailbox();
    return NextResponse.json(
      {
        ok: true,
        mailbox: result.mailboxEmail,
        syncedMessages: result.syncedMessages,
        createdCompanies: result.createdCompanies,
        createdCases: result.createdCases,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Ukjent sync-feil.",
      },
      { status: 500 },
    );
  }
}
