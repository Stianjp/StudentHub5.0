import { describe, expect, it } from "vitest";
import { buildLeadOverview, normalizeLeadCategories, readAllLeadOverviewRows } from "@/lib/lead-overview";

describe("lead overview", () => {
  it("counts unique active students, includes zeroes and sorts most popular first", () => {
    const rows = buildLeadOverview([
      { id: "a", name: "Alpha", industry: "IT", recruitment_fields: [] },
      { id: "b", name: "Beta", industry: "Bygg", recruitment_fields: [" IT ", "Bygg", "IT"] },
      { id: "c", name: "Gamma", industry: null, recruitment_fields: null },
    ], [
      { company_id: "b", student_id: "1", consent: true },
      { company_id: "b", student_id: "1", consent: true },
      { company_id: "b", student_id: "2", consent: true },
      { company_id: "a", student_id: "1", consent: true },
      { company_id: "c", student_id: "1", consent: false },
    ]);
    expect(rows.map((r) => [r.name, r.leadCount])).toEqual([["Beta", 2], ["Alpha", 1], ["Gamma", 0]]);
    expect(rows[0].categories).toEqual(["Data/IT", "Bygg"]);
    expect(rows[1].categories).toEqual(["Data/IT"]);
    expect(rows[2].categories).toEqual([]);
  });
  it("uses alphabetical order for ties and handles empty datasets", () => {
    expect(buildLeadOverview([], [])).toEqual([]);
    const companies = ["Zulu", "Alpha"].map((name) => ({ id: name, name, industry: null, recruitment_fields: [] }));
    expect(buildLeadOverview(companies, []).map((r) => r.name)).toEqual(["Alpha", "Zulu"]);
  });
  it("normalizes Norwegian and English duplicate categories without dropping unknown categories", () => {
    const rows = buildLeadOverview([
      {
        id: "a",
        name: "Alpha",
        industry: "IT / Computer engineer",
        recruitment_fields: [
          "IT / Computer engineer",
          "Data/IT",
          "Construction engineer",
          "Bygg",
          "Biotechnology and Chemical Engineer",
          "Biotek/Kjemi",
          "Electrical engineer",
          "Elektro",
          "Human resources (HR)",
          "HR",
          "Management",
          "Ledelse",
          "Economics and administration",
          "Økonomi",
          "Mechanical engineer",
          "Maskin",
          "Law",
        ],
      },
    ], []);

    expect(rows[0].categories).toEqual([
      "Data/IT",
      "Bygg",
      "Biotek/Kjemi",
      "Elektro",
      "HR",
      "Ledelse",
      "Økonomi",
      "Maskin",
      "Law",
    ]);
  });
  it("falls back to normalized industry when recruitment fields are empty", () => {
    expect(normalizeLeadCategories({ industry: "Construction engineer", recruitment_fields: [] })).toEqual(["Bygg"]);
  });
  it("reads beyond the API row limit without omitting a final full page", async () => {
    const dataset = Array.from({ length: 2000 }, (_, i) => i);
    const offsets: number[] = [];
    const rows = await readAllLeadOverviewRows(async (from, to) => {
      offsets.push(from);
      return { data: dataset.slice(from, to + 1), error: null };
    });
    expect(rows).toEqual(dataset);
    expect(offsets).toEqual([0, 1000, 2000]);
  });
  it("fails instead of presenting partial counts when a query fails", async () => {
    await expect(readAllLeadOverviewRows(async () => ({ data: null, error: new Error("Unavailable") }))).rejects.toThrow("Unavailable");
  });
});
