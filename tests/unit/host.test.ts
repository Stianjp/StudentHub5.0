import { describe, it, expect } from "vitest";
import { roleFromHost, defaultPathForRole } from "@/lib/host";

describe("roleFromHost", () => {
  it("returnerer 'student' for student-subdomene", () => {
    expect(roleFromHost("student.oslostudenthub.no")).toBe("student");
    expect(roleFromHost("student.localhost")).toBe("student");
  });

  it("returnerer 'company' for bedrift-subdomene", () => {
    expect(roleFromHost("bedrift.oslostudenthub.no")).toBe("company");
    expect(roleFromHost("bedrift.localhost")).toBe("company");
  });

  it("returnerer 'admin' for admin-subdomene", () => {
    expect(roleFromHost("admin.oslostudenthub.no")).toBe("admin");
    expect(roleFromHost("admin.localhost:3000")).toBe("admin");
  });

  it("returnerer null for ukjent host", () => {
    expect(roleFromHost("oslostudenthub.no")).toBeNull();
    expect(roleFromHost("eventregister.oslostudenthub.no")).toBeNull();
    expect(roleFromHost(null)).toBeNull();
    expect(roleFromHost("localhost:3000")).toBeNull();
  });

  it("er case-insensitiv", () => {
    expect(roleFromHost("ADMIN.oslostudenthub.no")).toBe("admin");
    expect(roleFromHost("Student.oslostudenthub.no")).toBe("student");
  });
});

describe("defaultPathForRole", () => {
  it("sender student til /student/dashboard", () => {
    expect(defaultPathForRole("student")).toBe("/student/dashboard");
  });

  it("sender company til /company", () => {
    expect(defaultPathForRole("company")).toBe("/company");
  });

  it("sender admin til /admin", () => {
    expect(defaultPathForRole("admin")).toBe("/admin");
    expect(defaultPathForRole("admin", "admin.oslostudenthub.no")).toBe("/admin");
  });
});
