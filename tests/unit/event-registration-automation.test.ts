import { describe, expect, it } from "vitest";
import {
  buildRegistrationConfirmationHtml,
  buildRegistrationNotificationHtml,
  buildRegistrationPackageGroupName,
} from "@/lib/event-registration-automation";

describe("buildRegistrationPackageGroupName", () => {
  it("bygger eventbasert gruppenavn for gullpakke", () => {
    expect(buildRegistrationPackageGroupName("SC26", "gold")).toBe("SC26-Gull");
  });

  it("returnerer null når prefiks mangler", () => {
    expect(buildRegistrationPackageGroupName("", "silver")).toBeNull();
  });
});

describe("registration email builders", () => {
  it("lager internvarsel med nøkkeldata", () => {
    const html = buildRegistrationNotificationHtml({
      applicationId: "app-1",
      companyName: "Testbedrift AS",
      eventName: "Student Connect 2026",
      packageName: "Gold",
      contactName: "Ola Nordmann",
      contactEmail: "ola@test.no",
    });

    expect(html).toContain("Testbedrift AS");
    expect(html).toContain("Student Connect 2026");
    expect(html).toContain("Application-ID");
  });

  it("forklarer at portaltilgang kommer etter godkjenning", () => {
    const html = buildRegistrationConfirmationHtml({
      companyName: "Testbedrift AS",
      eventName: "Student Connect 2026",
      packageName: "Silver",
      portalEmails: ["portal1@test.no", "portal2@test.no"],
    });

    expect(html).toContain("Portal access e-mails");
    expect(html).toContain("først invitert når OSH har godkjent søknaden");
    expect(html).toContain("portal1@test.no");
    expect(html).toContain("portal2@test.no");
  });
});
