import { beforeEach, describe, expect, it, vi } from "vitest";

const upsert = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({ from: () => ({ upsert }) }),
}));

import { POST } from "@/app/api/public/student-connect-2027-interest/route";

function request(body: unknown) {
  return new Request("http://localhost/api/public/student-connect-2027-interest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Student Connect 2027 interest", () => {
  beforeEach(() => {
    upsert.mockReset().mockResolvedValue({ error: null });
  });

  it.each([
    { companyName: "Acme AS", email: "contact@acme.no", consent: false },
    { companyName: "Acme AS", email: "invalid", consent: true },
    { companyName: "", email: "contact@acme.no", consent: true },
  ])("rejects invalid or non-consenting submissions", async (body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("normalizes e-mail and upserts by e-mail", async () => {
    const response = await POST(request({ companyName: "Acme AS", email: "  Contact@Acme.No  ", consent: true }));
    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ company_name: "Acme AS", email: "contact@acme.no", consented_at: expect.any(String) }),
      { onConflict: "email" },
    );
  });

  it("does not claim success when storage fails", async () => {
    upsert.mockResolvedValue({ error: new Error("database unavailable") });
    const response = await POST(request({ companyName: "Acme AS", email: "contact@acme.no", consent: true }));
    expect(response.status).toBe(500);
  });
});
