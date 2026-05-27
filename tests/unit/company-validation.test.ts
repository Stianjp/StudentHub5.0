import { describe, expect, it } from "vitest";
import { companyRepresentationSchema } from "@/lib/validation/company";

describe("companyRepresentationSchema", () => {
  it("accepts empty and 250-word representation text", () => {
    const words = Array.from({ length: 250 }, (_, index) => `ord${index}`).join(" ");

    expect(companyRepresentationSchema.safeParse({ representationText: "" }).success).toBe(true);
    expect(companyRepresentationSchema.safeParse({ representationText: words }).success).toBe(true);
  });

  it("rejects representation text above 250 words", () => {
    const words = Array.from({ length: 251 }, (_, index) => `ord${index}`).join(" ");
    const result = companyRepresentationSchema.safeParse({ representationText: words });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/maks 250 ord/i);
    }
  });
});
