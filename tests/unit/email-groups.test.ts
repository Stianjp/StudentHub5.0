import { describe, expect, it } from "vitest";
import {
  describeEmailGroupSync,
  filterApplicationsForDynamicGroup,
  parseEmailGroupFormData,
  selectLatestCompanyApplications,
} from "@/lib/email-groups";

type TestApplication = Parameters<typeof selectLatestCompanyApplications>[0][number];

function makeApplication(overrides: Partial<TestApplication> = {}): TestApplication {
  return {
    id: crypto.randomUUID(),
    campaign_id: crypto.randomUUID(),
    company_id: crypto.randomUUID(),
    company_name: "Equinor",
    contact_email: "kontakt@equinor.com",
    approved_package_id: crypto.randomUUID(),
    approved_at: new Date("2026-03-28T10:00:00.000Z").toISOString(),
    updated_at: new Date("2026-03-28T10:00:00.000Z").toISOString(),
    created_at: new Date("2026-03-28T09:00:00.000Z").toISOString(),
    ...overrides,
  };
}

describe("parseEmailGroupFormData", () => {
  it("tolker en manuell gruppe og nullstiller dynamiske filtre", () => {
    const formData = new FormData();
    formData.set("name", "SC-bedrifter");
    formData.set("description", "Alle manuelle bedrifter");
    formData.set("member_type", "company");
    formData.set("sync_mode", "manual");
    formData.set("dynamic_registration_campaign_id", "ignored");
    formData.set("dynamic_package_tier", "gold");
    formData.set("dynamic_pipeline_stage", "Påmeldt");

    expect(parseEmailGroupFormData(formData)).toMatchObject({
      name: "SC-bedrifter",
      member_type: "company",
      sync_mode: "manual",
      dynamic_registration_campaign_id: null,
      dynamic_package_tier: null,
      dynamic_pipeline_stage: null,
    });
  });

  it("krever kampanje når gruppen er dynamisk", () => {
    const formData = new FormData();
    formData.set("name", "SC Gold");
    formData.set("member_type", "company");
    formData.set("sync_mode", "dynamic_registration");

    expect(() => parseEmailGroupFormData(formData)).toThrow(/registreringskampanje/i);
  });
});

describe("selectLatestCompanyApplications", () => {
  it("beholder bare siste godkjente søknad per bedrift", () => {
    const companyId = crypto.randomUUID();
    const newest = makeApplication({
      company_id: companyId,
      approved_at: "2026-03-28T11:00:00.000Z",
      contact_email: "ny@firma.no",
    });
    const oldest = makeApplication({
      company_id: companyId,
      approved_at: "2026-03-28T08:00:00.000Z",
      contact_email: "gammel@firma.no",
    });

    const selected = selectLatestCompanyApplications([oldest, newest]);
    expect(selected).toHaveLength(1);
    expect(selected[0]?.contact_email).toBe("ny@firma.no");
  });
});

describe("filterApplicationsForDynamicGroup", () => {
  it("filtrerer på både pakke og CRM-status", () => {
    const goldPackageId = crypto.randomUUID();
    const silverPackageId = crypto.randomUUID();
    const matching = makeApplication({
      company_name: "Equinor",
      approved_package_id: goldPackageId,
    });
    const wrongPackage = makeApplication({
      company_name: "Statkraft",
      approved_package_id: silverPackageId,
    });
    const wrongStage = makeApplication({
      company_name: "Aker",
      approved_package_id: goldPackageId,
    });

    const filtered = filterApplicationsForDynamicGroup(
      [matching, wrongPackage, wrongStage],
      {
        dynamic_package_tier: "gold",
        dynamic_pipeline_stage: "Påmeldt",
      },
      new Map([
        [goldPackageId, "gold"],
        [silverPackageId, "silver"],
      ]),
      new Map([
        ["equinor", "Påmeldt"],
        ["statkraft", "Påmeldt"],
        ["aker", "Dialog"],
      ]),
    );

    expect(filtered.map((application) => application.company_name)).toEqual(["Equinor"]);
  });
});

describe("describeEmailGroupSync", () => {
  it("bygger lesbar oppsummering for dynamiske grupper", () => {
    expect(
      describeEmailGroupSync(
        {
          sync_mode: "dynamic_registration",
          dynamic_registration_campaign_id: "campaign-1",
          dynamic_package_tier: "gold",
          dynamic_pipeline_stage: "Påmeldt",
        },
        {
          "campaign-1": {
            id: "campaign-1",
            label: "Student Connect 2026",
            eventName: "Student Connect 2026",
          },
        },
      ),
    ).toBe("Dynamisk: Student Connect 2026 / Gold / Påmeldt");
  });
});
