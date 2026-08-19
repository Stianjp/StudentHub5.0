import { describe, expect, it } from "vitest";
import { buildCrmPipelineBoards, type CrmPipelineConfiguration } from "@/lib/crm-pipelines";
import type { CrmCompanyCard } from "@/lib/crm";

const now = "2026-08-19T10:00:00.000Z";

function makeCard(overrides: Partial<CrmCompanyCard> = {}): CrmCompanyCard {
  return {
    key: "acme::student connect 2026",
    company: "Acme AS",
    eventName: "Student Connect 2026",
    pipelineStage: "Venter kontrakt",
    companyChannelName: "",
    companyChannelId: "",
    totalContacts: 2,
    openLeadCount: 1,
    waitingReplyCount: 0,
    repliedCount: 1,
    pipelineValueTotal: 20_000,
    lastSentAtIso: now,
    lastUpdatedAtIso: now,
    leadIds: ["lead-1", "lead-2"],
    ...overrides,
  };
}

function makeConfiguration(): CrmPipelineConfiguration {
  return {
    pipelines: [
      {
        id: "payment",
        name: "Betalings- og kontraktstatus",
        position: 0,
        is_default: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: "mail",
        name: "Mailfrister - Bord/stoler",
        position: 1,
        is_default: false,
        created_at: now,
        updated_at: now,
      },
    ],
    stages: [
      { id: "registered", pipeline_id: "payment", name: "Påmeldt", position: 0, created_at: now, updated_at: now },
      { id: "contract", pipeline_id: "payment", name: "Venter kontrakt", position: 1, created_at: now, updated_at: now },
      { id: "company", pipeline_id: "mail", name: "Bedrift", position: 0, created_at: now, updated_at: now },
      { id: "sent", pipeline_id: "mail", name: "Sendt mail", position: 1, created_at: now, updated_at: now },
    ],
    positions: [],
    participants: [
      {
        key: "id:company-1::event-1",
        companyId: "company-1",
        eventId: "event-1",
        company: "Acme AS",
        eventName: "Student Connect 2026",
        updatedAt: now,
      },
    ],
  };
}

describe("buildCrmPipelineBoards", () => {
  it("bruker eksisterende betalingsstatus i standardpipelinen", () => {
    const boards = buildCrmPipelineBoards(makeConfiguration(), [makeCard()]);
    const payment = boards.find((pipeline) => pipeline.id === "payment");

    expect(payment?.stages.find((stage) => stage.id === "contract")?.companies).toHaveLength(1);
  });

  it("legger alle deltakende bedrifter i første kolonne i en ny pipeline", () => {
    const boards = buildCrmPipelineBoards(makeConfiguration(), [makeCard()]);
    const mail = boards.find((pipeline) => pipeline.id === "mail");

    expect(mail?.stages[0]?.companies[0]?.company).toBe("Acme AS");
    expect(mail?.stages[1]?.companies).toHaveLength(0);
  });

  it("holder plasseringer uavhengige mellom pipelines", () => {
    const configuration = makeConfiguration();
    configuration.positions.push({
      id: "position-1",
      pipeline_id: "mail",
      stage_id: "sent",
      company_key: "id:company-1::event-1",
      company_id: "company-1",
      event_id: "event-1",
      company_name: "Acme AS",
      event_name: "Student Connect 2026",
      created_at: now,
      updated_at: now,
    });

    const boards = buildCrmPipelineBoards(configuration, [makeCard()]);
    const payment = boards.find((pipeline) => pipeline.id === "payment");
    const mail = boards.find((pipeline) => pipeline.id === "mail");

    expect(payment?.stages.find((stage) => stage.id === "contract")?.companies).toHaveLength(1);
    expect(mail?.stages.find((stage) => stage.id === "sent")?.companies).toHaveLength(1);
  });
});
