import { NextResponse } from "next/server";
import { z } from "zod";
import { sendTransactionalEmail } from "@/lib/resend";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const partnerInquirySchema = z
  .object({
    eventType: z.enum([
      "Company presentation",
      "Social event with students",
      "Help to promote for students",
      "Other",
    ]),
    eventTypeOther: z.string().optional().or(z.literal("")),
    name: z.string().min(2),
    companyName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(5),
    details: z.string().min(5),
  })
  .superRefine((value, ctx) => {
    if (value.eventType === "Other" && !value.eventTypeOther?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["eventTypeOther"],
        message: "Please specify the event type.",
      });
    }
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
    const parsed = partnerInquirySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Please complete all required fields." },
        { status: 400 },
      );
    }

    const selectedEventType =
      parsed.data.eventType === "Other"
        ? parsed.data.eventTypeOther.trim()
        : parsed.data.eventType;

    const supabase = createAdminSupabaseClient();
    const subject = `Partner inquiry: ${parsed.data.companyName}`;
    const html = `
      <div style="font-family:Arial,sans-serif;color:#1A1626;">
        <h2>New partner inquiry</h2>
        <p><strong>Event type:</strong> ${escapeHtml(selectedEventType)}</p>
        <p><strong>Name:</strong> ${escapeHtml(parsed.data.name)}</p>
        <p><strong>Company:</strong> ${escapeHtml(parsed.data.companyName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(parsed.data.email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(parsed.data.phone)}</p>
        <p><strong>Request:</strong><br />${escapeHtml(parsed.data.details).replace(/\n/g, "<br />")}</p>
      </div>
    `;

    await Promise.all([
      sendTransactionalEmail({
        to: "amruta@oslostudenthub.no",
        subject,
        html,
        type: "website_partner_inquiry",
        payload: { ...parsed.data, selectedEventType },
        supabase,
      }),
      sendTransactionalEmail({
        to: "stian@oslostudenthub.no",
        subject,
        html,
        type: "website_partner_inquiry",
        payload: { ...parsed.data, selectedEventType },
        supabase,
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not send your inquiry right now." },
      { status: 500 },
    );
  }
}
