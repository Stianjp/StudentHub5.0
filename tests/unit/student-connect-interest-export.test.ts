import { beforeEach, expect, it, vi } from "vitest";

const getUser = vi.fn();
const maybeSingle = vi.fn();
const range = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({
    from: () => ({ select: () => ({ order: () => ({ order: () => ({ range }) }) }) }),
  }),
}));

import { GET } from "@/app/api/admin/student-connect-2027-interest/export/route";

beforeEach(() => {
  getUser.mockReset();
  maybeSingle.mockReset();
  range.mockReset().mockResolvedValue({ data: [], error: null });
});

it("denies CSV export without an admin session", async () => {
  getUser.mockResolvedValue({ data: { user: null } });
  expect((await GET()).status).toBe(403);
  expect(range).not.toHaveBeenCalled();

  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  maybeSingle.mockResolvedValue({ data: { role: "company" } });
  expect((await GET()).status).toBe(403);
  expect(range).not.toHaveBeenCalled();
});

it("exports consented contacts for admins without spreadsheet formulas", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
  maybeSingle.mockResolvedValue({ data: { role: "admin" } });
  range.mockResolvedValue({
    data: [{ company_name: "=2+2", email: "contact@example.com", consented_at: "2026-11-07T12:00:00Z" }],
    error: null,
  });
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Disposition")).toContain(".csv");
  expect(await response.text()).toContain("'=2+2");
});
