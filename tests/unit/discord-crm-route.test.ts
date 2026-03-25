import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const syncCrmLeadEntryFromFields = vi.fn();
const syncLeadToGoogleSheet = vi.fn();

vi.mock("@/lib/crm-supabase", () => ({
  syncCrmLeadEntryFromFields,
}));

vi.mock("@/lib/crm-sheet-sync", () => ({
  syncLeadToGoogleSheet,
}));

describe("POST /api/integrations/discord/crm", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.CRM_SYNC_WEBHOOK_SECRET = "secret";
    delete process.env.CRM_GOOGLE_SHEET_ID;
    delete process.env.CRM_GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.CRM_GOOGLE_PRIVATE_KEY;
    syncCrmLeadEntryFromFields.mockReset();
    syncLeadToGoogleSheet.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("synker alltid til Supabase selv uten Google Sheet-konfig", async () => {
    const { POST } = await import("@/app/api/integrations/discord/crm/route");
    const request = new Request("http://localhost/api/integrations/discord/crm", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-crm-webhook-secret": "secret",
      },
      body: JSON.stringify({
        action: "lead_created",
        leadId: "lead-1",
        company: "Testbedrift AS",
        eventName: "Student Connect 2026",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(syncCrmLeadEntryFromFields).toHaveBeenCalledWith({
      leadId: "lead-1",
      updates: expect.objectContaining({
        company: "Testbedrift AS",
        eventName: "Student Connect 2026",
        leadStatus: "pending_approval",
        companyStatus: "Kontaktet",
      }),
    });
    expect(syncLeadToGoogleSheet).not.toHaveBeenCalled();
    expect(body.googleSheet).toEqual({ attempted: false });
  });

  it("speiler til Google Sheets når konfig finnes", async () => {
    process.env.CRM_GOOGLE_SHEET_ID = "sheet";
    process.env.CRM_GOOGLE_SERVICE_ACCOUNT_EMAIL = "service@test.iam.gserviceaccount.com";
    process.env.CRM_GOOGLE_PRIVATE_KEY = "private-key";
    syncLeadToGoogleSheet.mockResolvedValue({
      mode: "appended",
      rowNumber: 12,
      leadId: "lead-2",
    });

    const { POST } = await import("@/app/api/integrations/discord/crm/route");
    const request = new Request("http://localhost/api/integrations/discord/crm", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-crm-webhook-secret": "secret",
      },
      body: JSON.stringify({
        action: "email_sent",
        leadId: "lead-2",
        company: "Testbedrift AS",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(syncLeadToGoogleSheet).toHaveBeenCalled();
    expect(body.googleSheet).toEqual({
      attempted: true,
      ok: true,
      mode: "appended",
      rowNumber: 12,
    });
  });
});
