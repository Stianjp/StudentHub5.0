import { describe, expect, it } from "vitest";
import { updateCompanyDetailsSchema } from "@/lib/validation/admin";

describe("updateCompanyDetailsSchema", () => {
  it("normalizes org numbers and websites", () => {
    const result = updateCompanyDetailsSchema.safeParse({
      companyId: "912b94bb-48f2-44ac-8782-b80d365fc36c",
      name: "Oslo Student Hub",
      orgNumber: "987 654 321",
      industry: "Teknologi",
      size: "",
      location: "Oslo",
      address: "",
      postalCode: "",
      city: "",
      country: "",
      website: "oslostudenthub.no",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orgNumber).toBe("987654321");
      expect(result.data.website).toBe("https://oslostudenthub.no");
      expect(result.data.location).toBe("Oslo");
    }
  });

  it("allows clearing optional company details", () => {
    const result = updateCompanyDetailsSchema.safeParse({
      companyId: "912b94bb-48f2-44ac-8782-b80d365fc36c",
      name: "Oslo Student Hub",
      orgNumber: "",
      industry: "",
      size: "",
      location: "",
      address: "",
      postalCode: "",
      city: "",
      country: "",
      website: "",
    });

    expect(result.success).toBe(true);
  });
});
