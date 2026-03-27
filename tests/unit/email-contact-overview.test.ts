import { describe, expect, it } from "vitest";
import {
  appendCaseNumberToSubject,
  buildDefaultCaseTitle,
  caseStatusLabel,
  caseStatusVariant,
  deriveCompanyNameFromDomain,
  extractDomainFromEmail,
  normalizeDomain,
  parseCaseNumberFromSubject,
  summarizeMessageBody,
} from "@/lib/email-contact-overview";
import type { TableRow } from "@/lib/types/database";

type ContactMessage = TableRow<"email_contact_case_messages">;

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
});
