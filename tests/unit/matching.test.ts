import { describe, expect, it } from "vitest";
import { computeMatch, isCompanyRelevantForStudent, type StudentMatchProfile } from "@/lib/matching";
import type { TableRow } from "@/lib/types/database";

type Company = TableRow<"companies">;

function createCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: "company-1",
    user_id: null,
    name: "Testbedrift",
    org_number: null,
    industry: "Data/IT",
    size: null,
    location: "Oslo",
    website: null,
    recruitment_roles: [],
    recruitment_fields: ["Data/IT"],
    recruitment_levels: ["Bachelor"],
    recruitment_years_bachelor: [2, 3],
    recruitment_years_master: [],
    recruitment_job_types: ["Fast jobb"],
    recruitment_timing: [],
    branding_values: ["Læring"],
    branding_evp: null,
    branding_message: null,
    work_style: null,
    social_profile: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

const baseStudent: StudentMatchProfile = {
  study_program: "Informatikk",
  study_level: "Bachelor",
  graduation_year: null,
  study_year: 2,
  job_types: ["Fast jobb"],
  interests: ["Teknologi"],
  values: ["Læring"],
  preferred_locations: ["Oslo"],
  willing_to_relocate: false,
  liked_company_ids: [],
};

describe("matching", () => {
  it("tolker studieprogram som fagmatch for Data/IT-bedrifter", () => {
    const company = createCompany();
    const result = computeMatch(baseStudent, company);

    expect(result.signals.studyFieldScore).toBeGreaterThan(0);
    expect(result.signals.relevant).toBe(true);
  });

  it("filtrerer bort bedrifter som ikke matcher studieretning eller jobbtype", () => {
    const company = createCompany({
      recruitment_fields: ["Økonomi"],
      recruitment_job_types: ["Sommerjobb"],
      recruitment_levels: ["Master"],
      recruitment_years_bachelor: [],
    });

    const relevance = isCompanyRelevantForStudent(baseStudent, company);
    expect(relevance.relevant).toBe(false);
  });
});
