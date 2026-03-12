import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizePipelineStage } from "@/lib/crm";
import { syncLeadToGoogleSheet, type CrmSyncField } from "@/lib/crm-sheet-sync";

const syncPayloadSchema = z
  .object({
    action: z.enum(["email_sent", "status_changed", "lead_replied", "email_bounced", "lead_created"]).optional(),
    leadId: z.string().min(3),
    company: z.string().optional(),
    contactName: z.string().optional(),
    contactEmail: z.string().email().optional(),
    subject: z.string().optional(),
    threadId: z.string().optional(),
    sourceMessageId: z.string().optional(),
    sentAtIso: z.string().optional(),
    sequenceStep: z.union([z.number().int().min(0), z.string()]).optional(),
    leadStatus: z.string().optional(),
    stopReason: z.string().nullable().optional(),
    snoozeUntilIso: z.string().nullable().optional(),
    companyChannelName: z.string().optional(),
    companyChannelId: z.string().optional(),
    companyStatus: z.string().optional(),
    eventName: z.string().optional(),
    temperature: z.string().optional(),
    pipelineValue: z.union([z.number(), z.string()]).optional(),
    updatedAtIso: z.string().optional(),
  })
  .passthrough();

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function hasOwn(obj: object, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function normalizeValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export async function POST(request: Request) {
  const secret = process.env.CRM_SYNC_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Missing CRM_SYNC_WEBHOOK_SECRET" }, { status: 500 });
  }

  const headerSecret = request.headers.get("x-crm-webhook-secret")?.trim();
  const authHeader = request.headers.get("authorization")?.trim();
  const bearerSecret = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (headerSecret !== secret && bearerSecret !== secret) {
    return unauthorized();
  }

  const rawBody = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!rawBody) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = syncPayloadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const updates: Partial<Record<CrmSyncField, string>> = {};

  const directFields: Array<[keyof typeof payload, CrmSyncField]> = [
    ["company", "company"],
    ["contactName", "contactName"],
    ["contactEmail", "contactEmail"],
    ["subject", "subject"],
    ["threadId", "threadId"],
    ["sourceMessageId", "sourceMessageId"],
    ["sentAtIso", "sentAtIso"],
    ["sequenceStep", "sequenceStep"],
    ["leadStatus", "leadStatus"],
    ["stopReason", "stopReason"],
    ["snoozeUntilIso", "snoozeUntilIso"],
    ["companyChannelName", "companyChannelName"],
    ["companyChannelId", "companyChannelId"],
    ["companyStatus", "companyStatus"],
    ["eventName", "eventName"],
    ["temperature", "temperature"],
    ["pipelineValue", "pipelineValue"],
    ["updatedAtIso", "updatedAtIso"],
  ];

  directFields.forEach(([payloadKey, field]) => {
    if (!hasOwn(rawBody, payloadKey)) return;
    const rawValue = normalizeValue(payload[payloadKey]);
    updates[field] = field === "companyStatus" ? normalizePipelineStage(rawValue) || rawValue : rawValue;
  });

  if (payload.action === "lead_created") {
    if (!updates.leadStatus) updates.leadStatus = "pending_approval";
    if (!updates.companyStatus) updates.companyStatus = "Kontaktet";
  }

  if (payload.action === "email_sent") {
    if (!updates.leadStatus) updates.leadStatus = "waiting";
    if (!updates.companyStatus) updates.companyStatus = "Kontaktet";
  }

  if (payload.action === "lead_replied") {
    if (!updates.leadStatus) updates.leadStatus = "replied";
    if (!updates.stopReason) updates.stopReason = "replied";
    if (!updates.companyStatus) updates.companyStatus = "Dialog";
  }

  if (payload.action === "email_bounced") {
    if (!updates.leadStatus) updates.leadStatus = "bounced";
    if (!updates.stopReason) updates.stopReason = "bounced";
    if (!updates.companyStatus) updates.companyStatus = "Tapt";
  }

  try {
    const result = await syncLeadToGoogleSheet({
      leadId: payload.leadId,
      updates,
    });

    return NextResponse.json(
      {
        ok: true,
        mode: result.mode,
        rowNumber: result.rowNumber,
        leadId: result.leadId,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync CRM sheet";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
