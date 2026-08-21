import { describe, expect, it } from "vitest";
import { companyContactEmailSchema, updateCompanyDetailsSchema } from "@/lib/validation/admin";

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

describe("companyContactEmailSchema", () => {
  it("normalizes the address and accepts an optional label", () => {
    const result = companyContactEmailSchema.safeParse({
      companyId: "912b94bb-48f2-44ac-8782-b80d365fc36c",
      email: " Kontakt@Bedrift.NO ",
      label: " Faktura ",
      isPrimary: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("kontakt@bedrift.no");
      expect(result.data.label).toBe("Faktura");
      expect(result.data.isPrimary).toBe(true);
    }
  });

  it("rejects invalid email addresses", () => {
    const result = companyContactEmailSchema.safeParse({
      companyId: "912b94bb-48f2-44ac-8782-b80d365fc36c",
      email: "ikke-en-epost",
      label: "",
      isPrimary: false,
    });

    expect(result.success).toBe(false);
  });
});
