import { describe, expect, it } from "vitest";
import {
  isOshAdminEmail,
  mapStudentJobTypes,
  validateHostRoleLock,
  validateMagicLinkRoleForHost,
  validatePasswordStrength,
} from "@/lib/auth-registration";
import {
  buildCompanyLocation,
  getEmailDomain,
  normalizeOrgNumber,
} from "@/lib/company-access";

describe("validatePasswordStrength", () => {
  it("godkjenner sterke passord", () => {
    expect(validatePasswordStrength("Sterkt!123", "Sterkt!123")).toBeNull();
  });

  it("avviser korte passord", () => {
    expect(validatePasswordStrength("Kort1!", "Kort1!")).toMatch(/Passord må være minst 8 tegn/i);
  });

  it("avviser passord uten stor bokstav, tall eller spesialtegn", () => {
    expect(validatePasswordStrength("svaktpassord!", "svaktpassord!")).toBeTruthy();
    expect(validatePasswordStrength("Svaktpassord!", "Svaktpassord!")).toBeTruthy();
    expect(validatePasswordStrength("Svaktpassord1", "Svaktpassord1")).toBeTruthy();
  });

  it("avviser ulike passord", () => {
    expect(validatePasswordStrength("Sterkt!123", "Sterkt!124")).toBe("Passordene må være like.");
  });
});

describe("host-låsing", () => {
  it("tillater riktig rolle på riktig domene", () => {
    expect(validateHostRoleLock("student.oslostudenthub.no", "student")).toBeNull();
    expect(validateHostRoleLock("bedrift.oslostudenthub.no", "company")).toBeNull();
  });

  it("avviser registrering på feil domene", () => {
    expect(validateHostRoleLock("student.oslostudenthub.no", "company")).toMatch(/bedrift-domenet/i);
    expect(validateHostRoleLock("bedrift.oslostudenthub.no", "student")).toMatch(/student-domenet/i);
    expect(validateHostRoleLock("admin.oslostudenthub.no", "student")).toMatch(/ikke tilgjengelig/i);
  });

  it("låser magic link til gjeldende domene", () => {
    expect(validateMagicLinkRoleForHost("student.oslostudenthub.no", "student")).toBeNull();
    expect(validateMagicLinkRoleForHost("bedrift.oslostudenthub.no", "student")).toMatch(/bare bedriftsinnlogging/i);
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

  it("normaliserer bedriftsdatahjelpere", () => {
    expect(normalizeOrgNumber(" 123 45 6789 ")).toBe("123456789");
    expect(getEmailDomain("Hei@Bedrift.no")).toBe("bedrift.no");
    expect(buildCompanyLocation({ city: "Oslo", country: "Norge" })).toBe("Oslo, Norge");
  });
});
