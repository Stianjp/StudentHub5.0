import { describe, expect, it } from "vitest";
import { validateGalaDinnerAttendee } from "@/lib/gala-dinner";

describe("validateGalaDinnerAttendee", () => {
  it("trimmer feltene og lagrer tom allergitekst som null", () => {
    expect(validateGalaDinnerAttendee({ fullName: "  Ada Nordmann  ", allergens: "  " })).toEqual({
      data: { fullName: "Ada Nordmann", allergens: null },
    });
  });

  it("avviser tomt navn og felt over makslengde", () => {
    const result = validateGalaDinnerAttendee({
      fullName: " ",
      allergens: "a".repeat(501),
    });

    expect(result.errors).toEqual({
      fullName: "Navn er påkrevd.",
      allergens: "Allergener kan ikke være lengre enn 500 tegn.",
    });
  });

  it("tillater navn og allergener på maksimal lengde", () => {
    const result = validateGalaDinnerAttendee({
      fullName: "n".repeat(120),
      allergens: "a".repeat(500),
    });

    expect(result.data?.fullName).toHaveLength(120);
    expect(result.data?.allergens).toHaveLength(500);
  });
});
