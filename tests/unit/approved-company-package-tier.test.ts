import { describe, expect, it } from "vitest";
import { resolveApprovedCompanyPackageTier } from "@/lib/hovedside/approved-companies";

describe("resolveApprovedCompanyPackageTier", () => {
  it.each([
    ["platinum", "Platinum", "platinum"],
    ["gold", "Gold", "gold"],
    ["silver", "Silver", "silver"],
    ["standard", "Standard", "standard"],
  ] as const)("uses mapped package %s", (mappedPackage, label, expected) => {
    expect(resolveApprovedCompanyPackageTier(mappedPackage, label)).toBe(expected);
  });

  it("can recover the tier from the public package or stand label", () => {
    expect(resolveApprovedCompanyPackageTier(null, "Gull", "Gold 3")).toBe(
      "gold",
    );
    expect(resolveApprovedCompanyPackageTier(null, null, "Sølv 8")).toBe(
      "silver",
    );
  });
});
