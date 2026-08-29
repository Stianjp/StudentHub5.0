import { describe, expect, it } from "vitest";
import {
  getStudentJobTypeOptions,
  getPasswordStrengthSummary,
  getStudyYearOptions,
  isOshAdminEmail,
  mapStudentJobTypes,
  validateStudentStudyChoices,
  validateHostRoleLock,
  validateMagicLinkRoleForHost,
  validatePasswordStrength,
} from "@/lib/auth-registration";
import {
  buildCompanyLocation,
  getEmailDomain,
  normalizeOrgNumber,
} from "@/lib/company-access";
import { studentRegistrationSchema } from "@/lib/validation/auth";

describe("validatePasswordStrength", () => {
  it("godkjenner sterke passord", () => {
    expect(validatePasswordStrength("Sterkt!123", "Sterkt!123")).toBeNull();
  });

  it("avviser korte passord", () => {
    expect(validatePasswordStrength("Kort1!", "Kort1!")).toMatch(/Password must be at least 8 characters/i);
  });

  it("avviser passord uten stor bokstav, tall eller spesialtegn", () => {
    expect(validatePasswordStrength("svaktpassord!", "svaktpassord!")).toBeTruthy();
    expect(validatePasswordStrength("Svaktpassord!", "Svaktpassord!")).toBeTruthy();
    expect(validatePasswordStrength("Svaktpassord1", "Svaktpassord1")).toBeTruthy();
  });

  it("avviser ulike passord", () => {
    expect(validatePasswordStrength("Sterkt!123", "Sterkt!124")).toBe("The passwords must match.");
  });

  it("beregner styrkenivå for UI", () => {
    expect(getPasswordStrengthSummary("", "").label).toBe("None");
    expect(getPasswordStrengthSummary("svak", "").label).toBe("Weak");
    expect(getPasswordStrengthSummary("Sterk123", "").label).toBe("Medium");
    const matchRequirement = getPasswordStrengthSummary("Sterk!123", "Sterk!123").requirements.find(
      (item) => item.key === "match",
    );
    expect(matchRequirement?.met).toBe(true);
    expect(getPasswordStrengthSummary("Sterk!123", "Sterk!123").label).toBe("Strong");
  });
});

describe("host-låsing", () => {
  it("tillater riktig rolle på riktig domene", () => {
    expect(validateHostRoleLock("student.oslostudenthub.no", "student")).toBeNull();
    expect(validateHostRoleLock("bedrift.oslostudenthub.no", "company")).toBeNull();
  });

  it("avviser registrering på feil domene", () => {
    expect(validateHostRoleLock("student.oslostudenthub.no", "company")).toMatch(/company domain/i);
    expect(validateHostRoleLock("bedrift.oslostudenthub.no", "student")).toMatch(/student domain/i);
    expect(validateHostRoleLock("admin.oslostudenthub.no", "student")).toMatch(/not available/i);
  });

  it("låser magic link til gjeldende domene", () => {
    expect(validateMagicLinkRoleForHost("student.oslostudenthub.no", "student")).toBeNull();
    expect(validateMagicLinkRoleForHost("bedrift.oslostudenthub.no", "student")).toMatch(/only supports company sign-in/i);
  });
});

describe("email og felt-normalisering", () => {
  it("krever @oslostudenthub.no for admin", () => {
    expect(isOshAdminEmail("admin@oslostudenthub.no")).toBe(true);
    expect(isOshAdminEmail("admin@example.com")).toBe(false);
  });

  it("mapper fulltidsjobb til eksisterende fast-jobb-verdi", () => {
    expect(mapStudentJobTypes(["Fulltidsjobb", "Sommerjobb", "Fulltidsjobb"])).toEqual([
      "Fast jobb",
      "Sommerjobb",
    ]);
  });

  it("tilpasser år og oppgavetyper til valgt studienivå", () => {
    expect(getStudyYearOptions("Bachelor")).toEqual([1, 2, 3]);
    expect(getStudyYearOptions("Master")).toEqual([1, 2, 3, 4, 5]);
    expect(getStudentJobTypeOptions("Bachelor").map((option) => option.value)).not.toContain("Masteroppgave");
    expect(getStudentJobTypeOptions("Master").map((option) => option.value)).not.toContain("Bacheloroppgave");
  });

  it("avviser masteroppgave for bachelorstudent og ugyldig årstrinn", () => {
    expect(
      validateStudentStudyChoices({
        studyLevel: "Bachelor",
        studyYear: 4,
        jobTypes: ["Deltidsjobb"],
      }),
    ).toEqual({
      studyYear: "Bachelor students can only select years 1-3.",
    });

    expect(
      validateStudentStudyChoices({
        studyLevel: "Bachelor",
        studyYear: 2,
        jobTypes: ["Masteroppgave"],
      }),
    ).toEqual({
      jobTypes: "Master thesis is only available to master students.",
    });
  });

  it("krever gyldig kategori og nivå i studentregistreringen", () => {
    const result = studentRegistrationSchema.safeParse({
      email: "student@example.com",
      fullName: "Ola Nordmann",
      school: "NTNU",
      studyProgram: "Informatikk",
      studyLevel: "Bachelor",
      studyYear: 2,
      jobTypes: ["Deltidsjobb"],
      password: "Sterkt!123",
      confirmPassword: "Sterkt!123",
    });

    expect(result.success).toBe(false);
  });

  it("godkjenner registrering med eksisterende kategorioversikt", () => {
    const result = studentRegistrationSchema.safeParse({
      email: "student@example.com",
      fullName: "Ola Nordmann",
      school: "NTNU",
      studyProgram: "Data/IT",
      studyLevel: "Master",
      studyYear: 4,
      jobTypes: ["Masteroppgave", "Sommerjobb"],
      password: "Sterkt!123",
      confirmPassword: "Sterkt!123",
    });

    expect(result.success).toBe(true);
  });

  it("normaliserer bedriftsdatahjelpere", () => {
    expect(normalizeOrgNumber(" 123 45 6789 ")).toBe("123456789");
    expect(getEmailDomain("Hei@Bedrift.no")).toBe("bedrift.no");
    expect(buildCompanyLocation({ city: "Oslo", country: "Norge" })).toBe("Oslo, Norge");
  });
});
