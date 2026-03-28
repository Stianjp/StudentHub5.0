import { beforeEach, describe, expect, it, vi } from "vitest";

const createAdminSupabaseClient = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient,
}));

describe("lead helpers handle deleted companies", () => {
  beforeEach(() => {
    createAdminSupabaseClient.mockReset();
  });

  it("skipper samtykke når company ikke finnes lenger", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    createAdminSupabaseClient.mockReturnValue({ from });

    const { upsertConsentForStudent } = await import("@/lib/lead");
    const result = await upsertConsentForStudent({
      studentId: "student-1",
      companyId: "missing-company",
      consentGiven: true,
      source: "student_portal",
    });

    expect(result).toBeNull();
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("companies");
  });

  it("filtrerer bort slettede company ids", async () => {
    const inFn = vi.fn().mockResolvedValue({
      data: [{ id: "company-a" }, { id: "company-c" }],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ in: inFn });
    const from = vi.fn().mockReturnValue({ select });

    createAdminSupabaseClient.mockReturnValue({ from });

    const { filterExistingCompanyIds } = await import("@/lib/lead");
    const result = await filterExistingCompanyIds([
      "company-a",
      "company-b",
      "company-a",
      "company-c",
      "",
    ]);

    expect(result).toEqual(["company-a", "company-c"]);
    expect(from).toHaveBeenCalledWith("companies");
    expect(inFn).toHaveBeenCalledWith("id", ["company-a", "company-b", "company-c"]);
  });
});
