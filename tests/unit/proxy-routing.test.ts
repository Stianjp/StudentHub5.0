import { describe, it, expect } from "vitest";

// Subdomain → basePath mapping (mirrors HOST_TARGETS in proxy.ts)
const HOST_TARGETS = [
  { match: "eventregister.", basePath: "/event-register" },
  { match: "bedrift.", basePath: "/company" },
  { match: "admin.", basePath: "/admin" },
  { match: "student.", basePath: "/student" },
  { match: "checkin.", basePath: "/checkin" },
  { match: "connecthub.", basePath: "/event" },
  { match: "studentconnect.", basePath: "/event" },
  { match: "event.", basePath: "/event" },
];

function resolveBasePath(host: string): string | null {
  const h = host.split(":")[0].toLowerCase();
  return HOST_TARGETS.find((t) => h.startsWith(t.match))?.basePath ?? null;
}

describe("Subdomain routing (proxy.ts HOST_TARGETS)", () => {
  it("ruter eventregister til /event-register", () => {
    expect(resolveBasePath("eventregister.oslostudenthub.no")).toBe("/event-register");
  });

  it("ruter bedrift til /company", () => {
    expect(resolveBasePath("bedrift.oslostudenthub.no")).toBe("/company");
  });

  it("ruter admin til /admin", () => {
    expect(resolveBasePath("admin.oslostudenthub.no")).toBe("/admin");
  });

  it("ruter student til /student", () => {
    expect(resolveBasePath("student.oslostudenthub.no")).toBe("/student");
  });

  it("ruter checkin til /checkin", () => {
    expect(resolveBasePath("checkin.oslostudenthub.no")).toBe("/checkin");
  });

  it("returnerer null for ukjent subdomene", () => {
    expect(resolveBasePath("oslostudenthub.no")).toBeNull();
    expect(resolveBasePath("localhost:3000")).toBeNull();
    expect(resolveBasePath("unknown.oslostudenthub.no")).toBeNull();
  });

  it("ruter event-subdomener til /event", () => {
    expect(resolveBasePath("event.oslostudenthub.no")).toBe("/event");
    expect(resolveBasePath("connecthub.oslostudenthub.no")).toBe("/event");
    expect(resolveBasePath("studentconnect.oslostudenthub.no")).toBe("/event");
  });
});
