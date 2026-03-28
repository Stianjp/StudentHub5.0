import { describe, expect, it } from "vitest";
import {
  appendCaseNumberToSubject,
  buildDefaultCaseTitle,
  caseStatusLabel,
  caseStatusVariant,
  deriveCompanyNameFromDomain,
  extractDomainFromEmail,
  filterOverviewCasesByStatus,
  isAutoArchivedContactSender,
  normalizeDomain,
  parseCaseNumberFromSubject,
  summarizeMessageBody,
} from "@/lib/email-contact-overview";
import type { TableRow } from "@/lib/types/database";

type ContactCase = TableRow<"email_contact_cases">;
type ContactMessage = TableRow<"email_contact_case_messages">;

function makeCase(overrides: Partial<ContactCase> = {}): ContactCase {
  return {
    id: crypto.randomUUID(),
    contact_company_id: crypto.randomUUID(),
    event_id: null,
    case_number: "OSH-000001",
    title: "Eksempelsak",
    status: "open",
    contact_name: null,
    contact_email: null,
    latest_message_at: new Date().toISOString(),
    merged_into_case_id: null,
    archived_at: null,
    closed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeMessage(overrides: Partial<ContactMessage> = {}): ContactMessage {
  return {
    id: crypto.randomUUID(),
    case_id: crypto.randomUUID(),
    direction: "inbound",
    source: "gmail_sync",
    gmail_message_id: null,
    gmail_thread_id: null,
    internet_message_id: null,
    in_reply_to_message_id: null,
    from_email: "kontakt@bedrift.no",
    from_name: "Kontaktperson",
    to_emails: ["stian@oslostudenthub.no"],
    cc_emails: [],
    subject: "Hei",
    body_text: null,
    body_html: null,
    sent_at: null,
    received_at: new Date().toISOString(),
    raw_headers: {},
    moved_from_case_id: null,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("parseCaseNumberFromSubject", () => {
  it("finner saksnummer med klammer", () => {
    expect(parseCaseNumberFromSubject("Student Connect 2026 [OSH-000123]")).toBe("OSH-000123");
  });

  it("finner saksnummer uten klammer", () => {
    expect(parseCaseNumberFromSubject("Re: OSH-000456 møte")).toBe("OSH-000456");
  });

  it("returnerer null når emnet ikke har saksnummer", () => {
    expect(parseCaseNumberFromSubject("Vanlig emne")).toBeNull();
  });
});

describe("appendCaseNumberToSubject", () => {
  it("legger til saksnummer bakerst når det mangler", () => {
    expect(appendCaseNumberToSubject("Student Connect 2026", "OSH-000123")).toBe(
      "Student Connect 2026 [OSH-000123]",
    );
  });

  it("dupliserer ikke eksisterende saksnummer", () => {
    expect(appendCaseNumberToSubject("Student Connect 2026 [OSH-000123]", "OSH-000123")).toBe(
      "Student Connect 2026 [OSH-000123]",
    );
  });
});

describe("domenehjelpere", () => {
  it("normaliserer domener og e-postdomener", () => {
    expect(normalizeDomain("WWW.Example.COM")).toBe("example.com");
    expect(extractDomainFromEmail("Kontakt <hello@sub.example.com>")).toBe("sub.example.com");
  });

  it("deriverer lesbart bedriftsnavn fra domene", () => {
    expect(deriveCompanyNameFromDomain("norsk-hydrogen.no")).toBe("Norsk Hydrogen");
  });

  it("matcher autoarkiverte avsendere på e-post", () => {
    expect(isAutoArchivedContactSender("DMARCReport@Microsoft.com")).toBe(true);
    expect(isAutoArchivedContactSender("kontakt@microsoft.com")).toBe(false);
  });
});

describe("buildDefaultCaseTitle", () => {
  it("bygger tittel med event når det finnes", () => {
    expect(buildDefaultCaseTitle("Equinor", "Student Connect 2026")).toBe(
      "Student Connect 2026 - Equinor x Oslo Student Hub",
    );
  });

  it("bygger tittel uten event når event mangler", () => {
    expect(buildDefaultCaseTitle("Equinor", null)).toBe("Equinor x Oslo Student Hub");
  });
});

describe("case status", () => {
  it("returnerer riktige labels og badges", () => {
    expect(caseStatusLabel("unsorted")).toBe("Usortert");
    expect(caseStatusLabel("open")).toBe("Åpen");
    expect(caseStatusLabel("closed")).toBe("Lukket");
    expect(caseStatusVariant("unsorted")).toBe("warning");
    expect(caseStatusVariant("open")).toBe("info");
    expect(caseStatusVariant("closed")).toBe("success");
    expect(caseStatusVariant("archived")).toBe("default");
  });
});

describe("filterOverviewCasesByStatus", () => {
  const cases = [
    makeCase({ status: "unsorted", case_number: "OSH-000001" }),
    makeCase({ status: "open", case_number: "OSH-000002" }),
    makeCase({ status: "closed", case_number: "OSH-000003", closed_at: new Date().toISOString() }),
    makeCase({ status: "archived", case_number: "OSH-000004", archived_at: new Date().toISOString() }),
    makeCase({ status: "open", case_number: "OSH-000005", merged_into_case_id: crypto.randomUUID() }),
  ];

  it("viser bare åpne og usorterte i aktiv visning", () => {
    expect(filterOverviewCasesByStatus(cases, "active").map((caseRow) => caseRow.case_number)).toEqual([
      "OSH-000001",
      "OSH-000002",
    ]);
  });

  it("viser bare lukkede i lukket visning", () => {
    expect(filterOverviewCasesByStatus(cases, "closed").map((caseRow) => caseRow.case_number)).toEqual([
      "OSH-000003",
    ]);
  });

  it("viser bare arkiverte i arkivvisning", () => {
    expect(filterOverviewCasesByStatus(cases, "archived").map((caseRow) => caseRow.case_number)).toEqual([
      "OSH-000004",
    ]);
  });
});

describe("summarizeMessageBody", () => {
  it("prioriterer body_text når den finnes", () => {
    expect(summarizeMessageBody(makeMessage({ body_text: "Ren tekst", body_html: "<p>HTML</p>" }))).toBe(
      "Ren tekst",
    );
  });

  it("stripper html når bare html finnes", () => {
    expect(
      summarizeMessageBody(
        makeMessage({
          body_text: null,
          body_html: "<div><strong>Hei</strong><br />Vi venter på logo.</div>",
        }),
      ),
    ).toContain("Hei Vi venter på logo.");
  });

  it("viser ikke hele sitert tråd når body_text allerede er trimmet", () => {
    expect(
      summarizeMessageBody(
        makeMessage({
          body_text: "Hei, vi sender logo i morgen.\n\nOn Mon, someone wrote:\nTidligere melding",
        }),
      ),
    ).toBe("Hei, vi sender logo i morgen.");
  });

  it("fjerner markedsføringsfooter og sporingslenker fra sammendraget", () => {
    expect(
      summarizeMessageBody(
        makeMessage({
          body_text:
            "Hei, her er oppdateringen du trenger.\n\nLinkedIn (https://www.checkinevent.com/e3t/Ctc/S+superlang-sporingslenke-som-ikke-bor-vises-1234567890123456789012345678901234567890)\nInstagram (https://www.checkinevent.com/e3t/Ctc/S+enda-en-superlang-sporingslenke-1234567890123456789012345678901234567890)\nAvslutt abonnement (https://www.checkinevent.com/hs/preferences-center/en/direct?lang=nb&tracking=123456789012345678901234567890)",
        }),
      ),
    ).toBe("Hei, her er oppdateringen du trenger.");
  });

  it("beholder legitime lenker i sammendraget slik at UI kan gjøre dem klikkbare", () => {
    expect(
      summarizeMessageBody(
        makeMessage({
          body_text:
            "Se dokumentet her: https://example.com/veldig/lang/url/som/fortsetter/i/det/uendelige/med/mange/parametere/og/tegn/1234567890123456789012345678901234567890",
        }),
      ),
    ).toContain("https://example.com/");
  });
});
