import { describe, expect, it } from "vitest";
import {
  getSafePortalNextPath,
  isStudentOnboardingComplete,
  resolveOAuthPortalRole,
} from "@/lib/auth-oauth";

describe("Google OAuth portal security", () => {
  it("derives the production role from the portal host", () => {
    expect(resolveOAuthPortalRole("student.oslostudenthub.no", "company", false)).toBe("student");
    expect(resolveOAuthPortalRole("bedrift.oslostudenthub.no", "student", false)).toBe("company");
    expect(resolveOAuthPortalRole("admin.oslostudenthub.no", "student", false)).toBeNull();
  });

  it("only uses the requested role as a local development fallback", () => {
    expect(resolveOAuthPortalRole("localhost:3000", "student", true)).toBe("student");
    expect(resolveOAuthPortalRole("www.oslostudenthub.no", "company", false)).toBeNull();
  });

  it("rejects external and cross-portal return addresses", () => {
    expect(getSafePortalNextPath("https://example.com", "student")).toBe("/student/dashboard");
    expect(getSafePortalNextPath("//example.com", "company")).toBe("/company");
    expect(getSafePortalNextPath("/admin", "student")).toBe("/student/dashboard");
    expect(getSafePortalNextPath("/company/leads", "company")).toBe("/company/leads");
  });

  it("requires the core student fields before leaving onboarding", () => {
    expect(isStudentOnboardingComplete(null)).toBe(false);
    expect(isStudentOnboardingComplete({
      full_name: "Student Test",
      school: "UiO",
      study_program: "Data/IT",
      study_level: "Master",
      study_year: 2,
    })).toBe(true);
  });
});
