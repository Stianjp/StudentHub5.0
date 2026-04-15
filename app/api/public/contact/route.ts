import { NextResponse } from "next/server";
import { z } from "zod";
import { sendTransactionalEmail } from "@/lib/resend";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(5),
  message: z.string().min(5),
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Please fill in name, e-mail, phone number and message." },
        { status: 400 },
      );
    }

    const supabase = createAdminSupabaseClient();
    await sendTransactionalEmail({
      to: "support@oslostudenthub.no",
      subject: `Website contact form: ${parsed.data.name}`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#1A1626;">
          <h2>New website contact request</h2>
          <p><strong>Name:</strong> ${escapeHtml(parsed.data.name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(parsed.data.email)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(parsed.data.phone)}</p>
          <p><strong>Message:</strong><br />${escapeHtml(parsed.data.message).replace(/\n/g, "<br />")}</p>
        </div>
      `,
      type: "website_contact",
      payload: parsed.data,
      supabase,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not send your message right now." },
      { status: 500 },
    );
  }
}
