import { describe, expect, it } from "vitest";
import {
  companyContactSchema,
  companyPortalInviteSchema,
  updateCompanyDetailsSchema,
} from "@/lib/validation/admin";

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

describe("companyPortalInviteSchema", () => {
  it("normalizes the address", () => {
    const result = companyPortalInviteSchema.safeParse({
      companyId: "912b94bb-48f2-44ac-8782-b80d365fc36c",
      email: " Kontakt@Bedrift.NO ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("kontakt@bedrift.no");
    }
  });

  it("rejects invalid email addresses", () => {
    const result = companyPortalInviteSchema.safeParse({
      companyId: "912b94bb-48f2-44ac-8782-b80d365fc36c",
      email: "ikke-en-epost",
    });

    expect(result.success).toBe(false);
  });
});

describe("companyContactSchema", () => {
  it("normalizes a primary contact", () => {
    const result = companyContactSchema.safeParse({
      companyId: "912b94bb-48f2-44ac-8782-b80d365fc36c",
      contactType: "primary",
      name: " Kari Nordmann ",
      jobTitle: " HR-leder ",
      email: " KARI@BEDRIFT.NO ",
      phone: " +47 900 00 000 ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Kari Nordmann");
      expect(result.data.email).toBe("kari@bedrift.no");
      expect(result.data.contactType).toBe("primary");
    }
  });

  it("allows a contact without email or phone", () => {
    const result = companyContactSchema.safeParse({
      companyId: "912b94bb-48f2-44ac-8782-b80d365fc36c",
      contactType: "secondary",
      name: "Ola Nordmann",
      jobTitle: "",
      email: "",
      phone: "",
    });

    expect(result.success).toBe(true);
  });
});
