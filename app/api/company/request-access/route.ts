import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const schema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  orgNumber: z.string().regex(/^\d{9}$/),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ugyldig data. Sjekk e-post og organisasjonsnummer." },
      { status: 400 },
    );
  }

  const { userId, email, orgNumber } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();
  const domain = normalizedEmail.split("@")[1] ?? "";

  if (!domain) {
    return NextResponse.json({ error: "E-post må inneholde domene." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  const { data: existingRequest } = await supabase
    .from("company_user_requests")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingRequest) {
    return NextResponse.json({ ok: true });
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, org_number")
    .eq("org_number", orgNumber)
    .maybeSingle();

  if (companyError) {
    return NextResponse.json({ error: "Kunne ikke slå opp bedrift." }, { status: 500 });
  }

  if (!company) {
    return NextResponse.json(
      { error: "Bedriften er ikke registrert ennå. Kontakt OSH-admin." },
      { status: 404 },
    );
  }

  const { data: domainRow } = await supabase
    .from("company_domains")
    .select("domain")
    .eq("company_id", company.id)
    .eq("domain", domain)
    .maybeSingle();

  if (!domainRow) {
    return NextResponse.json(
      { error: "E-postdomenet matcher ikke registrert bedriftsdomene." },
      { status: 400 },
    );
  }

  const { error: insertError } = await supabase.from("company_user_requests").insert({
    user_id: userId,
    email: normalizedEmail,
    domain,
    company_id: company.id,
    org_number: orgNumber,
  });

  if (insertError) {
    return NextResponse.json({ error: "Kunne ikke opprette forespørsel." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
