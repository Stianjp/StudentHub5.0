import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureCompanyAccessRequest } from "@/lib/company-access";

const schema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  orgNumber: z.string().regex(/^\d{9}$/).optional(),
  companyName: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  recruitmentFields: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ugyldig data. Sjekk e-post og bedriftsinformasjon." },
        { status: 400 },
      );
    }

    await ensureCompanyAccessRequest({
      userId: parsed.data.userId,
      email: parsed.data.email,
      orgNumber: parsed.data.orgNumber,
      companyName: parsed.data.companyName,
      address: parsed.data.address,
      postalCode: parsed.data.postalCode,
      city: parsed.data.city,
      country: parsed.data.country,
      recruitmentFields: parsed.data.recruitmentFields,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
