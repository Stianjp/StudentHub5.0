import { describe, expect, it } from "vitest";
import { calcProfileCompletion, uniqueParticipatingCompanies, mergeVisibleFavourites } from "@/lib/student-portal";

describe("student portal", () => {
  it("keeps the original ten-field completion calculation", () => {
    expect(calcProfileCompletion({})).toBe(0);
    expect(calcProfileCompletion({ full_name: "Ada", email: "ada@example.com", phone: "  " })).toBe(20);
    expect(calcProfileCompletion({
      full_name: "Ada", email: "ada@example.com", phone: "12345678", study_program: "Data/IT",
      study_level: "Bachelor", study_year: 2, work_style: "Hybrid", social_profile: "https://example.com",
      team_size: "1-5", about: "Student",
    })).toBe(100);
  });

  it("deduplicates by company ID while preserving public package order", () => {
    const companies = [
      { id: "application-gold", companyId: "a" },
      { id: "application-silver", companyId: "b" },
      { id: "application-standard", companyId: "a" },
      { id: "unlinked", companyId: null },
    ];
    expect(uniqueParticipatingCompanies(companies)).toEqual(companies.slice(0, 2));
    expect(uniqueParticipatingCompanies([])).toEqual([]);
  });

  it("preserves favourites outside the visible filter and event when saving", () => {
    expect(mergeVisibleFavourites(["hidden", "other-event", "visible-a"], ["visible-b"], ["visible-a", "visible-b"]))
      .toEqual(["hidden", "other-event", "visible-b"]);
  });

  it("preserves freshly saved hidden favourites and ignores submitted hidden changes", () => {
    expect(mergeVisibleFavourites(["new-in-other-tab", "visible"], ["injected-hidden"], ["visible"]))
      .toEqual(["new-in-other-tab"]);
    expect(mergeVisibleFavourites(["a"], [], [])).toEqual(["a"]);
  });
});
