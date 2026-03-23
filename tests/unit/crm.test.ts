import { describe, it, expect, beforeEach } from "vitest";
import {
  normalizePipelineStage,
  isLeadMissingReply,
  getLeadAgeInDays,
  CRM_PIPELINE_STAGES,
  type CrmLead,
} from "@/lib/crm";

function makeLead(overrides: Partial<CrmLead> = {}): CrmLead {
  return {
    rowNumber: 1,
    leadId: "lead-1",
    company: "Testbedrift AS",
    contactName: "Ola Nordmann",
    contactEmail: "ola@test.no",
    subject: "Henvendelse",
    threadId: "",
    sourceMessageId: "",
    sentAtIso: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 dager siden
    sequenceStep: "1",
    leadStatus: "waiting",
    stopReason: "",
    snoozeUntilIso: "",
    companyChannelName: "",
    companyChannelId: "",
    companyStatus: "Kontaktet",
    eventName: "Student Connect 2026",
    temperature: "varm",
    pipelineValue: "50000",
    updatedAtIso: new Date().toISOString(),
    raw: {},
    ...overrides,
  };
}

describe("CRM_PIPELINE_STAGES", () => {
  it("inneholder alle forventede steg", () => {
    expect(CRM_PIPELINE_STAGES).toContain("Kontaktet");
    expect(CRM_PIPELINE_STAGES).toContain("Venter svar");
    expect(CRM_PIPELINE_STAGES).toContain("Dialog");
    expect(CRM_PIPELINE_STAGES).toContain("Påmeldt");
    expect(CRM_PIPELINE_STAGES).toContain("Tapt");
    expect(CRM_PIPELINE_STAGES).toHaveLength(5);
  });
});

describe("normalizePipelineStage", () => {
  it("returnerer gyldig stage uendret", () => {
    expect(normalizePipelineStage("Kontaktet")).toBe("Kontaktet");
    expect(normalizePipelineStage("Dialog")).toBe("Dialog");
    expect(normalizePipelineStage("Påmeldt")).toBe("Påmeldt");
    expect(normalizePipelineStage("Tapt")).toBe("Tapt");
  });

  it("returnerer tom streng for ugyldig verdi", () => {
    expect(normalizePipelineStage("Ukjent")).toBe("");
    expect(normalizePipelineStage("")).toBe("");
    expect(normalizePipelineStage("dialog")).toBe(""); // case-sensitive
  });
});

describe("isLeadMissingReply", () => {
  it("returnerer true for waiting-lead uten snooze", () => {
    const lead = makeLead({ leadStatus: "waiting", snoozeUntilIso: "" });
    expect(isLeadMissingReply(lead)).toBe(true);
  });

  it("returnerer false for replied-lead", () => {
    const lead = makeLead({ leadStatus: "replied" });
    expect(isLeadMissingReply(lead)).toBe(false);
  });

  it("returnerer false for waiting-lead med aktiv snooze", () => {
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const lead = makeLead({ leadStatus: "waiting", snoozeUntilIso: futureDate });
    expect(isLeadMissingReply(lead)).toBe(false);
  });

  it("returnerer true for waiting-lead med utløpt snooze", () => {
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const lead = makeLead({ leadStatus: "waiting", snoozeUntilIso: pastDate });
    expect(isLeadMissingReply(lead)).toBe(true);
  });
});

describe("getLeadAgeInDays", () => {
  it("returnerer omtrent riktig antall dager", () => {
    const sentAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const lead = makeLead({ sentAtIso: sentAt });
    const age = getLeadAgeInDays(lead);
    expect(age).toBeGreaterThanOrEqual(6);
    expect(age).toBeLessThanOrEqual(8);
  });

  it("returnerer 0 for tom sentAtIso", () => {
    const lead = makeLead({ sentAtIso: "" });
    expect(getLeadAgeInDays(lead)).toBe(0);
  });

  it("returnerer 0 for lead sendt i dag", () => {
    const lead = makeLead({ sentAtIso: new Date().toISOString() });
    expect(getLeadAgeInDays(lead)).toBe(0);
  });
});
