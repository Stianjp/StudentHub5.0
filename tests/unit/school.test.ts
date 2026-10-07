import { describe, expect, it } from "vitest";
import { normalizeSchoolName, resolveSchoolFormValue, SCHOOL_OTHER_VALUE } from "@/lib/school";

describe("school normalization", () => {
  it.each([
    ["Oslmet", "OsloMet"],
    ["Oslomer", "OsloMet"],
    ["Oslomey", "OsloMet"],
    ["Kjemiingeniør,Oslomet", "OsloMet"],
    ["Høyskolen Kristianina", "Høyskolen Kristiania"],
    ["Høyskolen Kristianka", "Høyskolen Kristiania"],
    ["HK", "Høyskolen Kristiania"],
    ["BI handelsskole", "BI"],
    ["Handelsskole BI", "BI"],
    ["Universitetet og Oslo", "UiO"],
    ["Universitet i Stavanger", "UiS"],
    ["Universitetet i Agder", "UiA"],
    ["Universitetet i Bergen", "UiB"],
    ["Nord universitet", "Nord universitet"],
    ["VID vitenskapelige høgskole", "VID"],
    ["MF vitenskapelig høyskole", "MF"],
  ])("maps %s to %s", (input, expected) => {
    expect(normalizeSchoolName(input)).toBe(expected);
  });

  it("clears private email addresses used as school names", () => {
    expect(normalizeSchoolName("person@gmail.com")).toBe("");
  });

  it("uses the Other text when Other is selected", () => {
    expect(resolveSchoolFormValue(SCHOOL_OTHER_VALUE, "Handelsskole BI")).toBe("BI");
    expect(resolveSchoolFormValue(SCHOOL_OTHER_VALUE, "")).toBe(SCHOOL_OTHER_VALUE);
  });
});
