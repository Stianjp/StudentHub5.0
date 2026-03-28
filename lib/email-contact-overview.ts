import type { TableInsert, TableRow, TableUpdate } from "@/lib/types/database";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  GMAIL_READ_SCOPE,
  GMAIL_SEND_SCOPE,
  getGmailWorkspaceConfig,
  gmailApiFetch,
} from "@/lib/gmail-workspace";

type ContactCompany = TableRow<"email_contact_companies">;
type ContactCase = TableRow<"email_contact_cases">;
type ContactMessage = TableRow<"email_contact_case_messages">;
type ChecklistItem = TableRow<"email_contact_case_checklist_items">;
type SyncState = TableRow<"email_contact_mailbox_sync_state">;
type Profile = TableRow<"profiles">;
type Company = TableRow<"companies">;
type CompanyDomain = TableRow<"company_domains">;
type Event = TableRow<"events">;
type CaseStatus = ContactCase["status"];
type ChecklistKey = ChecklistItem["item_key"];

const INTERNAL_DOMAIN = "oslostudenthub.no";
const DEFAULT_MAILBOX = "stian@oslostudenthub.no";
const CASE_NUMBER_PATTERN = /\[(OSH-\d{6})\]|(OSH-\d{6})/i;
const AUTO_ARCHIVE_CONTACT_SENDERS = new Set(["dmarcreport@microsoft.com"]);
const CHECKLIST_LABELS: Record<ChecklistKey, string> = {
  logo: "Venter på logo",
  tables_chairs: "Venter på bord/stoler",
  reply: "Venter på svar",
  contract: "Venter på kontrakt",
  payment: "Venter på betaling",
};

type MatchingContext = {
  contactCompanies: ContactCompany[];
  companies: Company[];
  companyDomains: CompanyDomain[];
};

type GmailHeader = {
  name?: string;
  value?: string;
};

type GmailBody = {
  data?: string;
};

type GmailPayload = {
  mimeType?: string;
  headers?: GmailHeader[];
  body?: GmailBody;
  parts?: GmailPayload[];
};

type GmailMessage = {
  id?: string;
  threadId?: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: GmailPayload;
};

export type ContactOverviewListItem = {
  company: ContactCompany;
  activeCase: ContactCase | null;
  eventName: string | null;
  latestMessageAt: string | null;
  openCaseCount: number;
  checklistCompleted: number;
  checklistTotal: number;
  unreadCount: number;
  owner: Profile | null;
};

export type ContactOverviewCompanyDetail = {
  company: ContactCompany;
  linkedCompany: Company | null;
  cases: ContactCase[];
  activeCase: ContactCase | null;
  activeCaseMessages: ContactMessage[];
  activeCaseChecklist: ChecklistItem[];
  eventOptions: Event[];
  relatedCases: ContactCase[];
  owners: Profile[];
  owner: Profile | null;
  unreadCount: number;
  caseUnreadCounts: Record<string, number>;
};

export type ContactOverviewOwnerFilter = "all" | "mine" | "team" | "unassigned";
export type ContactOverviewStatusFilter = "active" | "closed" | "archived" | "all";

export type ContactOverviewMailboxSummary = {
  delegatedUser: string | null;
  configured: boolean;
  missingConfig: string[];
  lastSyncedAt: string | null;
  lastError: string | null;
};

export type MailboxSyncResult = {
  syncedMessages: number;
  createdCompanies: number;
  createdCases: number;
  mailboxEmail: string;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeEmailAddress(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^@/, "").replace(/^www\./, "");
}

function tryParseUrlHost(value: string | null | undefined) {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    return normalizeDomain(new URL(trimmed).host);
  } catch {
    try {
      return normalizeDomain(new URL(`https://${trimmed}`).host);
    } catch {
      return normalizeDomain(trimmed.split("/")[0] ?? "");
    }
  }
}

function baseDomainCandidates(domain: string) {
  const normalized = normalizeDomain(domain);
  if (!normalized) return [] as string[];

  const parts = normalized.split(".").filter(Boolean);
  const values = new Set<string>([normalized]);

  if (parts.length >= 2) {
    values.add(parts.slice(-2).join("."));
  }
  if (parts.length >= 3) {
    values.add(parts.slice(-3).join("."));
  }

  return [...values];
}

export function extractDomainFromEmail(email: string) {
  const normalizedEmail = extractEmails(email)[0] ?? email.trim().toLowerCase();
  const match = normalizedEmail.match(/@([^>\s,;]+)$/);
  return match ? normalizeDomain(match[1]) : "";
}

export function deriveCompanyNameFromDomain(domain: string) {
  const firstPart = normalizeDomain(domain).split(".")[0] ?? "";
  const cleaned = firstPart.replace(/[^a-z0-9]+/gi, " ").trim();
  if (!cleaned) return "Ukjent bedrift";

  return cleaned
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function parseCaseNumberFromSubject(subject: string) {
  const match = subject.match(CASE_NUMBER_PATTERN);
  return match?.[1] ?? match?.[2] ?? null;
}

export function appendCaseNumberToSubject(subject: string, caseNumber: string) {
  const cleaned = normalizeWhitespace(subject);
  if (!cleaned) return `[${caseNumber}]`;
  if (parseCaseNumberFromSubject(cleaned)?.toLowerCase() === caseNumber.toLowerCase()) {
    return cleaned;
  }
  return `${cleaned} [${caseNumber}]`;
}

export function buildDefaultCaseTitle(companyName: string, eventName?: string | null) {
  const safeCompany = normalizeWhitespace(companyName) || "Ukjent bedrift";
  const safeEvent = normalizeWhitespace(eventName ?? "");
  if (safeEvent) {
    return `${safeEvent} - ${safeCompany} x Oslo Student Hub`;
  }
  return `${safeCompany} x Oslo Student Hub`;
}

function sortCasesNewestFirst(a: ContactCase, b: ContactCase) {
  const aTime = a.latest_message_at ?? a.updated_at ?? a.created_at;
  const bTime = b.latest_message_at ?? b.updated_at ?? b.created_at;
  return new Date(bTime).getTime() - new Date(aTime).getTime();
}

function stripHtmlTags(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function trimQuotedReply(value: string) {
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  const markers = [
    /^On .+wrote:$/m,
    /^Den .+skrev .+:$/m,
    /^Fra:.+$/m,
    /^From:.+$/m,
    /^Sendt:.+$/m,
    /^Sent:.+$/m,
    /^>.+$/m,
    /^-+Original Message-+$/m,
    /^_{5,}$/m,
  ];

  let cutIndex = normalized.length;
  for (const marker of markers) {
    const match = normalized.match(marker);
    if (!match || typeof match.index !== "number") continue;
    cutIndex = Math.min(cutIndex, match.index);
  }

  return normalized
    .slice(0, cutIndex)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function trimEmailFooter(value: string) {
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  const footerMarkers = [
    /^LinkedIn\s*\(/im,
    /^Instagram\s*\(/im,
    /^Facebook\s*\(/im,
    /^Twitter\s*\(/im,
    /^X\s*\(/im,
    /^Avslutt abonnement/im,
    /^Administrer preferanser/im,
    /^Manage preferences/im,
    /^Unsubscribe/im,
    /^View in browser/im,
  ];

  let cutIndex = normalized.length;
  for (const marker of footerMarkers) {
    const match = normalized.match(marker);
    if (!match || typeof match.index !== "number") continue;
    cutIndex = Math.min(cutIndex, match.index);
  }

  return normalized.slice(0, cutIndex).trim();
}

function sanitizeMessageSummary(value: string) {
  const withoutFooter = trimEmailFooter(value);
  const cleanedLines = withoutFooter
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      return true;
    });

  const normalized = cleanedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return normalized || "";
}

function getProfileLabel(profile: Profile | null | undefined) {
  return profile?.full_name?.trim() || "Uten navn";
}

function filterVisibleCases(cases: ContactCase[]) {
  const visible = cases.filter((caseRow) => !caseRow.merged_into_case_id && caseRow.status !== "archived");
  return visible.length > 0 ? visible : cases;
}

export function filterOverviewCasesByStatus(
  cases: ContactCase[],
  statusFilter: ContactOverviewStatusFilter,
) {
  return cases.filter((caseRow) => {
    if (caseRow.merged_into_case_id) return false;
    if (statusFilter === "active") {
      return caseRow.status === "open" || caseRow.status === "unsorted";
    }
    if (statusFilter === "closed") {
      return caseRow.status === "closed";
    }
    if (statusFilter === "archived") {
      return caseRow.status === "archived";
    }
    return true;
  });
}

export function isAutoArchivedContactSender(email: string | null | undefined) {
  const normalized = normalizeEmailAddress(email);
  if (!normalized) return false;
  return AUTO_ARCHIVE_CONTACT_SENDERS.has(normalized);
}

function decodeBase64Url(value: string | undefined) {
  if (!value) return "";
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  try {
    return Buffer.from(padded, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function readPayloadBody(payload: GmailPayload | undefined): { text: string; html: string } {
  if (!payload) {
    return { text: "", html: "" };
  }

  const mimeType = payload.mimeType?.toLowerCase() ?? "";
  const direct = decodeBase64Url(payload.body?.data);

  if (mimeType === "text/plain") {
    return { text: direct, html: "" };
  }
  if (mimeType === "text/html") {
    return { text: "", html: direct };
  }

  let text = "";
  let html = "";
  for (const part of payload.parts ?? []) {
    const child = readPayloadBody(part);
    if (!text && child.text) text = child.text;
    if (!html && child.html) html = child.html;
  }

  if (!text && !html && direct) {
    if (mimeType.includes("html")) return { text: "", html: direct };
    return { text: direct, html: "" };
  }

  return { text, html };
}

function getHeaderValue(headers: GmailHeader[] | undefined, name: string) {
  const found = headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase());
  return found?.value?.trim() ?? "";
}

function extractEmails(value: string) {
  const matches = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  return [...new Set(matches.map((item) => item.toLowerCase()))];
}

function extractPrimaryName(value: string) {
  const email = extractEmails(value)[0];
  if (!email) return normalizeWhitespace(value.replace(/^"|"$/g, ""));
  const withoutEmail = normalizeWhitespace(
    value
      .replace(email, "")
      .replace(/[<>"]/g, "")
      .replace(/\(\s*\)/g, ""),
  );
  return withoutEmail || null;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return date.toISOString();
}

function toPlainBody(text: string, html: string) {
  if (text.trim()) return trimQuotedReply(text.trim());
  if (html.trim()) return trimQuotedReply(stripHtmlTags(html));
  return "";
}

function resolveParticipants(message: GmailMessage, mailboxEmail: string) {
  const headers = message.payload?.headers;
  const fromHeader = getHeaderValue(headers, "From");
  const toHeader = getHeaderValue(headers, "To");
  const ccHeader = getHeaderValue(headers, "Cc");

  const fromEmail = extractEmails(fromHeader)[0] ?? "";
  const toEmails = extractEmails(toHeader);
  const ccEmails = extractEmails(ccHeader);
  const fromName = extractPrimaryName(fromHeader);

  const ownEmail = mailboxEmail.trim().toLowerCase();
  const externalTargets = [...toEmails, ...ccEmails].filter((email) => email !== ownEmail);
  const direction: ContactMessage["direction"] = fromEmail === ownEmail ? "outbound" : "inbound";

  const primaryExternalEmail =
    direction === "inbound"
      ? (fromEmail !== ownEmail ? fromEmail : externalTargets[0] ?? "")
      : (externalTargets[0] ?? (fromEmail !== ownEmail ? fromEmail : ""));

  const primaryExternalDomain = extractDomainFromEmail(primaryExternalEmail);

  return {
    direction,
    fromEmail,
    fromName,
    toEmails,
    ccEmails,
    primaryExternalEmail,
    primaryExternalDomain,
  };
}

function isInternalOnlyMessage(message: GmailMessage, mailboxEmail: string) {
  const participants = resolveParticipants(message, mailboxEmail);
  const domains = [
    extractDomainFromEmail(participants.fromEmail),
    ...participants.toEmails.map(extractDomainFromEmail),
    ...participants.ccEmails.map(extractDomainFromEmail),
  ].filter(Boolean);

  if (domains.length === 0) return true;
  return domains.every((domain) => domain === INTERNAL_DOMAIN);
}

async function loadMatchingContext() {
  const supabase = createAdminSupabaseClient();
  const [{ data: contactCompanies }, { data: companies }, { data: companyDomains }] = await Promise.all([
    supabase.from("email_contact_companies").select("*"),
    supabase.from("companies").select("*"),
    supabase.from("company_domains").select("*"),
  ]);

  return {
    contactCompanies: (contactCompanies ?? []) as ContactCompany[],
    companies: (companies ?? []) as Company[],
    companyDomains: (companyDomains ?? []) as CompanyDomain[],
  } satisfies MatchingContext;
}

async function archiveSuppressedSenderCompany(context: MatchingContext, email: string) {
  const normalizedEmail = normalizeEmailAddress(email);
  if (!normalizedEmail) return;

  const exactMatch = context.contactCompanies.find(
    (company) => normalizeEmailAddress(company.primary_email) === normalizedEmail,
  );
  const domainMatch = matchContactCompanyByDomain(context, extractDomainFromEmail(normalizedEmail));
  const match = exactMatch ?? domainMatch;
  if (!match || match.archived_at) return;

  await archiveContactCompany(match.id);
  const now = new Date().toISOString();
  const index = context.contactCompanies.findIndex((company) => company.id === match.id);
  if (index >= 0) {
    context.contactCompanies[index] = {
      ...match,
      archived_at: now,
      updated_at: now,
    };
  }
}

function matchContactCompanyByDomain(context: MatchingContext, domain: string) {
  const candidates = baseDomainCandidates(domain);
  for (const candidate of candidates) {
    const match = context.contactCompanies.find((item) => normalizeDomain(item.primary_domain) === candidate);
    if (match) return match;
  }
  return null;
}

function matchCompanyByDomain(context: MatchingContext, domain: string) {
  const candidates = baseDomainCandidates(domain);
  for (const candidate of candidates) {
    const linkedDomain = context.companyDomains.find((item) => normalizeDomain(item.domain) === candidate);
    if (linkedDomain) {
      const company = context.companies.find((item) => item.id === linkedDomain.company_id);
      if (company) return company;
    }
  }

  for (const company of context.companies) {
    const websiteHost = tryParseUrlHost(company.website);
    if (!websiteHost) continue;
    if (candidates.includes(websiteHost)) return company;
    if (baseDomainCandidates(websiteHost).some((candidate) => candidates.includes(candidate))) {
      return company;
    }
  }

  return null;
}

async function nextCaseNumber() {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("next_email_contact_case_number");
  if (error || !data) {
    throw new Error(error?.message || "Kunne ikke hente nytt saksnummer.");
  }
  return String(data);
}

export async function createContactCase(input: {
  contactCompanyId: string;
  companyName: string;
  eventId?: string | null;
  eventName?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  status?: CaseStatus;
  title?: string | null;
  latestMessageAt?: string | null;
}) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const caseNumber = await nextCaseNumber();
  const payload: TableInsert<"email_contact_cases"> = {
    contact_company_id: input.contactCompanyId,
    event_id: input.eventId ?? null,
    case_number: caseNumber,
    title: normalizeWhitespace(input.title ?? "") || buildDefaultCaseTitle(input.companyName, input.eventName),
    status: input.status ?? "open",
    contact_name: input.contactName ?? null,
    contact_email: input.contactEmail ?? null,
    latest_message_at: input.latestMessageAt ?? now,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase.from("email_contact_cases").insert(payload).select("*").single();
  if (error || !data) {
    throw new Error(error?.message || "Kunne ikke opprette sak.");
  }
  return data as ContactCase;
}

async function ensureContactCompanyForEmail(
  context: MatchingContext,
  input: {
    email: string;
    displayName?: string | null;
  },
) {
  const supabase = createAdminSupabaseClient();
  const domain = extractDomainFromEmail(input.email);
  if (!domain) {
    throw new Error("Kunne ikke finne domene for e-post.");
  }

  const existing = matchContactCompanyByDomain(context, domain);
  if (existing) {
    const update: TableUpdate<"email_contact_companies"> = {};
    if (existing.archived_at) update.archived_at = null;
    if (!existing.primary_email) update.primary_email = input.email;
    if (Object.keys(update).length > 0) {
      const { data, error } = await supabase
        .from("email_contact_companies")
        .update(update)
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error || !data) throw new Error(error?.message || "Kunne ikke oppdatere kontaktbedrift.");
      const index = context.contactCompanies.findIndex((item) => item.id === existing.id);
      if (index >= 0) context.contactCompanies[index] = data as ContactCompany;
      return { company: data as ContactCompany, created: false };
    }
    return { company: existing, created: false };
  }

  const linkedCompany = matchCompanyByDomain(context, domain);
  const now = new Date().toISOString();
  const payload: TableInsert<"email_contact_companies"> = {
    display_name: linkedCompany?.name ?? input.displayName ?? deriveCompanyNameFromDomain(domain),
    primary_domain: domain,
    primary_email: input.email,
    linked_company_id: linkedCompany?.id ?? null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase.from("email_contact_companies").insert(payload).select("*").single();
  if (error || !data) {
    throw new Error(error?.message || "Kunne ikke opprette kontaktbedrift.");
  }

  const typed = data as ContactCompany;
  context.contactCompanies.push(typed);
  return { company: typed, created: true };
}

async function resolveCaseForIncomingMessage(
  context: MatchingContext,
  message: GmailMessage,
  mailboxEmail: string,
) {
  const supabase = createAdminSupabaseClient();
  const headers = message.payload?.headers;
  const subject = getHeaderValue(headers, "Subject");
  const caseNumber = parseCaseNumberFromSubject(subject);
  const participants = resolveParticipants(message, mailboxEmail);

  if (caseNumber) {
    const { data } = await supabase
      .from("email_contact_cases")
      .select("*")
      .eq("case_number", caseNumber)
      .maybeSingle();
    const caseMatch = data as ContactCase | null;
    if (caseMatch?.merged_into_case_id) {
      const { data: mergedCase } = await supabase
        .from("email_contact_cases")
        .select("*")
        .eq("id", caseMatch.merged_into_case_id)
        .maybeSingle();
      if (mergedCase) {
        return { caseRow: mergedCase as ContactCase, contactCompany: context.contactCompanies.find((item) => item.id === mergedCase.contact_company_id) ?? null, createdCompany: false, createdCase: false };
      }
    }
    if (caseMatch) {
      return { caseRow: caseMatch, contactCompany: context.contactCompanies.find((item) => item.id === caseMatch.contact_company_id) ?? null, createdCompany: false, createdCase: false };
    }
  }

  if (message.threadId) {
    const { data: existingThreadMessage } = await supabase
      .from("email_contact_case_messages")
      .select("id, case_id")
      .eq("gmail_thread_id", message.threadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingThreadMessage?.case_id) {
      const { data: caseRow } = await supabase
        .from("email_contact_cases")
        .select("*")
        .eq("id", existingThreadMessage.case_id)
        .maybeSingle();
      const typedCase = caseRow as ContactCase | null;
      if (typedCase?.merged_into_case_id) {
        const { data: mergedCase } = await supabase
          .from("email_contact_cases")
          .select("*")
          .eq("id", typedCase.merged_into_case_id)
          .maybeSingle();
        if (mergedCase) {
          return { caseRow: mergedCase as ContactCase, contactCompany: context.contactCompanies.find((item) => item.id === mergedCase.contact_company_id) ?? null, createdCompany: false, createdCase: false };
        }
      }
      if (typedCase) {
        return { caseRow: typedCase, contactCompany: context.contactCompanies.find((item) => item.id === typedCase.contact_company_id) ?? null, createdCompany: false, createdCase: false };
      }
    }
  }

  const ensured = await ensureContactCompanyForEmail(context, {
    email: participants.primaryExternalEmail,
    displayName: participants.fromName ?? deriveCompanyNameFromDomain(participants.primaryExternalDomain),
  });

  const caseRow = await createContactCase({
    contactCompanyId: ensured.company.id,
    companyName: ensured.company.display_name,
    eventId: null,
    eventName: null,
    contactName: participants.fromName ?? null,
    contactEmail: participants.primaryExternalEmail,
    status: "unsorted",
    latestMessageAt: new Date().toISOString(),
  });

  return {
    caseRow,
    contactCompany: ensured.company,
    createdCompany: ensured.created,
    createdCase: true,
  };
}

async function storeMessageForCase(input: {
  caseId: string;
  direction: ContactMessage["direction"];
  source?: string;
  gmailMessageId?: string | null;
  gmailThreadId?: string | null;
  internetMessageId?: string | null;
  inReplyToMessageId?: string | null;
  fromEmail: string;
  fromName?: string | null;
  toEmails?: string[];
  ccEmails?: string[];
  subject?: string;
  bodyText?: string | null;
  bodyHtml?: string | null;
  sentAt?: string | null;
  receivedAt?: string | null;
  rawHeaders?: Record<string, string>;
  movedFromCaseId?: string | null;
  createdBy?: string | null;
}) {
  const supabase = createAdminSupabaseClient();

  if (input.gmailMessageId) {
    const { data: existing } = await supabase
      .from("email_contact_case_messages")
      .select("*")
      .eq("gmail_message_id", input.gmailMessageId)
      .maybeSingle();
    if (existing) {
      return {
        message: existing as ContactMessage,
        created: false,
      };
    }
  }

  const now = new Date().toISOString();
  const payload: TableInsert<"email_contact_case_messages"> = {
    case_id: input.caseId,
    direction: input.direction,
    source: input.source ?? "gmail_sync",
    gmail_message_id: input.gmailMessageId ?? null,
    gmail_thread_id: input.gmailThreadId ?? null,
    internet_message_id: input.internetMessageId ?? null,
    in_reply_to_message_id: input.inReplyToMessageId ?? null,
    from_email: input.fromEmail,
    from_name: input.fromName ?? null,
    to_emails: input.toEmails ?? [],
    cc_emails: input.ccEmails ?? [],
    subject: input.subject ?? "",
    body_text: input.bodyText ?? null,
    body_html: input.bodyHtml ?? null,
    sent_at: input.sentAt ?? null,
    received_at: input.receivedAt ?? null,
    raw_headers: input.rawHeaders ?? {},
    moved_from_case_id: input.movedFromCaseId ?? null,
    is_read: input.direction !== "inbound",
    read_at: input.direction !== "inbound" ? (input.sentAt ?? input.receivedAt ?? now) : null,
    read_by: input.direction !== "inbound" ? (input.createdBy ?? null) : null,
    created_by: input.createdBy ?? null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("email_contact_case_messages")
    .insert(payload)
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(error?.message || "Kunne ikke lagre melding.");
  }

  const latestAt = input.receivedAt ?? input.sentAt ?? now;
  const { data: currentCase } = await supabase
    .from("email_contact_cases")
    .select("status")
    .eq("id", input.caseId)
    .maybeSingle();
  const nextStatus =
    currentCase?.status === "unsorted" && input.direction === "inbound" && input.source === "gmail_sync"
      ? "unsorted"
      : "open";

  await supabase
    .from("email_contact_cases")
    .update({
      latest_message_at: latestAt,
      updated_at: now,
      status: nextStatus,
      archived_at: null,
      closed_at: null,
    })
    .eq("id", input.caseId);

  return {
    message: data as ContactMessage,
    created: true,
  };
}

function buildRawMimeMessage(input: {
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  htmlBody: string;
  inReplyTo?: string | null;
  references?: string | null;
}) {
  const lines = [
    `From: OSH CRM <${input.from}>`,
    `To: ${input.to.join(", ")}`,
    ...(input.cc.length > 0 ? [`Cc: ${input.cc.join(", ")}`] : []),
    `Subject: ${input.subject}`,
    ...(input.inReplyTo ? [`In-Reply-To: ${input.inReplyTo}`] : []),
    ...(input.references ? [`References: ${input.references}`] : []),
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    input.htmlBody,
  ];

  return Buffer.from(lines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function getMailboxConfig() {
  return getGmailWorkspaceConfig({
    defaultDelegatedUser: DEFAULT_MAILBOX,
    defaultTestRecipient: DEFAULT_MAILBOX,
  });
}

async function getMailboxSyncState(mailboxEmail: string) {
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("email_contact_mailbox_sync_state")
    .select("*")
    .eq("mailbox_email", mailboxEmail)
    .maybeSingle();
  return (data as SyncState | null) ?? null;
}

async function upsertMailboxSyncState(mailboxEmail: string, input: { lastSyncedAt?: string | null; lastError?: string | null }) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const payload: TableInsert<"email_contact_mailbox_sync_state"> = {
    mailbox_email: mailboxEmail,
    last_synced_at: input.lastSyncedAt ?? null,
    last_error: input.lastError ?? null,
    created_at: now,
    updated_at: now,
  };
  const { error } = await supabase
    .from("email_contact_mailbox_sync_state")
    .upsert(payload, { onConflict: "mailbox_email" });
  if (error) throw new Error(error.message);
}

function formatGmailAfterDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  const shifted = new Date(date.getTime() - 48 * 60 * 60 * 1000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

export async function syncContactOverviewMailbox(): Promise<MailboxSyncResult> {
  const { config, missingConfig } = getMailboxConfig();
  if (!config) {
    throw new Error(`Manglende Gmail-konfigurasjon: ${missingConfig.join(", ")}`);
  }

  const previousState = await getMailboxSyncState(config.delegatedUser);
  const afterDate = previousState?.last_synced_at ? formatGmailAfterDate(previousState.last_synced_at) : "";
  const q = [`in:anywhere`, afterDate ? `after:${afterDate}` : "newer_than:180d"].filter(Boolean).join(" ");

  let syncedMessages = 0;
  let createdCompanies = 0;
  let createdCases = 0;

  try {
    const context = await loadMatchingContext();
    const listResponse = await gmailApiFetch<{ messages?: Array<{ id?: string }> }>(
      config,
      `messages?maxResults=100&q=${encodeURIComponent(q)}`,
      { scopes: [GMAIL_READ_SCOPE] },
    );

    for (const listItem of listResponse.messages ?? []) {
      if (!listItem.id) continue;
      const message = await gmailApiFetch<GmailMessage>(
        config,
        `messages/${listItem.id}?format=full`,
        { scopes: [GMAIL_READ_SCOPE] },
      );
      if (!message.id) continue;
      if (isInternalOnlyMessage(message, config.delegatedUser)) continue;

      const headers = message.payload?.headers ?? [];
      const subject = getHeaderValue(headers, "Subject");
      const participants = resolveParticipants(message, config.delegatedUser);
      if (!participants.primaryExternalEmail || !participants.primaryExternalDomain) continue;
      if (
        isAutoArchivedContactSender(participants.fromEmail) ||
        isAutoArchivedContactSender(participants.primaryExternalEmail)
      ) {
        await archiveSuppressedSenderCompany(
          context,
          participants.primaryExternalEmail || participants.fromEmail,
        );
        continue;
      }

      const { text, html } = readPayloadBody(message.payload);
      const bodyText = toPlainBody(text, html);
      const receivedAt =
        message.internalDate && Number.isFinite(Number(message.internalDate))
          ? new Date(Number(message.internalDate)).toISOString()
          : new Date().toISOString();

      const routing = await resolveCaseForIncomingMessage(context, message, config.delegatedUser);
      if (routing.createdCompany) createdCompanies += 1;
      if (routing.createdCase) createdCases += 1;
      if (!routing.caseRow) continue;

      const stored = await storeMessageForCase({
        caseId: routing.caseRow.id,
        direction: participants.direction,
        source: "gmail_sync",
        gmailMessageId: message.id,
        gmailThreadId: message.threadId ?? null,
        internetMessageId: getHeaderValue(headers, "Message-Id") || getHeaderValue(headers, "Message-ID") || null,
        inReplyToMessageId: getHeaderValue(headers, "In-Reply-To") || null,
        fromEmail: participants.fromEmail,
        fromName: participants.fromName,
        toEmails: participants.toEmails,
        ccEmails: participants.ccEmails,
        subject,
        bodyText: bodyText || null,
        bodyHtml: html || null,
        sentAt: participants.direction === "outbound" ? receivedAt : null,
        receivedAt: participants.direction === "inbound" ? receivedAt : null,
        rawHeaders: Object.fromEntries(headers.map((header) => [header.name ?? "", header.value ?? ""])),
      });

      if (stored.created) syncedMessages += 1;
    }

    await upsertMailboxSyncState(config.delegatedUser, {
      lastSyncedAt: new Date().toISOString(),
      lastError: null,
    });
  } catch (error) {
    await upsertMailboxSyncState(config.delegatedUser, {
      lastSyncedAt: previousState?.last_synced_at ?? null,
      lastError: error instanceof Error ? error.message : "Ukjent sync-feil.",
    });
    throw error;
  }

  return {
    syncedMessages,
    createdCompanies,
    createdCases,
    mailboxEmail: config.delegatedUser,
  };
}

export async function sendContactCaseEmail(input: {
  caseId: string;
  to: string[];
  cc?: string[];
  subject: string;
  htmlBody: string;
  createdBy?: string | null;
}) {
  const { config, missingConfig } = getMailboxConfig();
  if (!config) {
    throw new Error(`Manglende Gmail-konfigurasjon: ${missingConfig.join(", ")}`);
  }

  const supabase = createAdminSupabaseClient();
  const { data: caseRow } = await supabase
    .from("email_contact_cases")
    .select("*")
    .eq("id", input.caseId)
    .single();
  const typedCase = caseRow as ContactCase | null;
  if (!typedCase) throw new Error("Fant ikke saken.");

  const { data: latestMessage } = await supabase
    .from("email_contact_case_messages")
    .select("*")
    .eq("case_id", input.caseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const finalSubject = appendCaseNumberToSubject(input.subject, typedCase.case_number);
  const raw = buildRawMimeMessage({
    from: config.delegatedUser,
    to: input.to,
    cc: input.cc ?? [],
    subject: finalSubject,
    htmlBody: input.htmlBody,
    inReplyTo: (latestMessage as ContactMessage | null)?.internet_message_id ?? null,
    references: (latestMessage as ContactMessage | null)?.internet_message_id ?? null,
  });

  const sendResponse = await gmailApiFetch<{ id?: string; threadId?: string }>(
    config,
    "messages/send",
    {
      method: "POST",
      body: JSON.stringify({
        raw,
        ...(latestMessage && (latestMessage as ContactMessage).gmail_thread_id
          ? { threadId: (latestMessage as ContactMessage).gmail_thread_id }
          : {}),
      }),
      scopes: [GMAIL_SEND_SCOPE],
    },
  );

  const now = new Date().toISOString();
  let internetMessageId: string | null = null;
  if (sendResponse.id) {
    try {
      const sentMessage = await gmailApiFetch<GmailMessage>(
        config,
        `messages/${sendResponse.id}?format=metadata&metadataHeaders=Message-ID`,
        { scopes: [GMAIL_READ_SCOPE] },
      );
      const headers = sentMessage.payload?.headers ?? [];
      internetMessageId = getHeaderValue(headers, "Message-Id") || getHeaderValue(headers, "Message-ID") || null;
    } catch {
      // Best effort only.
    }
  }

  await storeMessageForCase({
    caseId: input.caseId,
    direction: "outbound",
    source: "gmail_api",
    gmailMessageId: sendResponse.id ?? null,
    gmailThreadId: sendResponse.threadId ?? (latestMessage as ContactMessage | null)?.gmail_thread_id ?? null,
    internetMessageId,
    inReplyToMessageId: (latestMessage as ContactMessage | null)?.internet_message_id ?? null,
    fromEmail: config.delegatedUser,
    fromName: "OSH CRM",
    toEmails: input.to,
    ccEmails: input.cc ?? [],
    subject: finalSubject,
    bodyText: stripHtmlTags(input.htmlBody) || null,
    bodyHtml: input.htmlBody,
    sentAt: now,
    receivedAt: null,
    rawHeaders: {},
    createdBy: input.createdBy ?? null,
  });

  return {
    messageId: sendResponse.id ?? null,
    threadId: sendResponse.threadId ?? null,
    subject: finalSubject,
  };
}

export async function listContactOverviewOwners() {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "admin")
    .order("full_name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Profile[];
}

export async function countContactOverviewCompaniesForOwner(ownerProfileId: string) {
  const supabase = createAdminSupabaseClient();
  const { count, error } = await supabase
    .from("email_contact_companies")
    .select("id", { count: "exact", head: true })
    .eq("owner_profile_id", ownerProfileId)
    .is("archived_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function updateContactCompanyOwner(input: {
  contactCompanyId: string;
  ownerProfileId?: string | null;
}) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("email_contact_companies")
    .update({
      owner_profile_id: input.ownerProfileId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.contactCompanyId);
  if (error) throw new Error(error.message);
}

async function markCaseMessagesRead(caseId: string, readBy: string) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("email_contact_case_messages")
    .update({
      is_read: true,
      read_at: now,
      read_by: readBy,
      updated_at: now,
    })
    .eq("case_id", caseId)
    .eq("direction", "inbound")
    .eq("is_read", false);
  if (error) throw new Error(error.message);
}

export async function listContactOverviewCompanies(options?: {
  query?: string;
  ownerScope?: ContactOverviewOwnerFilter;
  statusFilter?: ContactOverviewStatusFilter;
  currentProfileId?: string | null;
}): Promise<ContactOverviewListItem[]> {
  const supabase = createAdminSupabaseClient();
  const query = normalizeWhitespace(options?.query ?? "").toLowerCase();
  const ownerScope = options?.ownerScope ?? "all";
  const statusFilter = options?.statusFilter ?? "active";

  const [{ data: companies }, { data: cases }, { data: checklist }, { data: events }, { data: messages }, owners] = await Promise.all([
    supabase.from("email_contact_companies").select("*").order("updated_at", { ascending: false }),
    supabase.from("email_contact_cases").select("*"),
    supabase.from("email_contact_case_checklist_items").select("*"),
    supabase.from("events").select("id, name"),
    supabase.from("email_contact_case_messages").select("case_id, direction, is_read"),
    listContactOverviewOwners(),
  ]);

  const typedCompanies = (companies ?? []) as ContactCompany[];
  const typedCases = (cases ?? []) as ContactCase[];
  const typedChecklist = (checklist ?? []) as ChecklistItem[];
  const typedMessages = (messages ?? []) as Array<Pick<ContactMessage, "case_id" | "direction" | "is_read">>;
  const typedOwners = owners as Profile[];
  const eventNameById = new Map(((events ?? []) as Event[]).map((event) => [event.id, event.name]));
  const ownerById = new Map(typedOwners.map((owner) => [owner.id, owner]));

  return typedCompanies
    .filter((company) => !isAutoArchivedContactSender(company.primary_email))
    .filter((company) => (statusFilter === "archived" || statusFilter === "all" ? true : !company.archived_at))
    .filter((company) => {
      if (ownerScope === "mine") return company.owner_profile_id === options?.currentProfileId;
      if (ownerScope === "team") return Boolean(company.owner_profile_id);
      if (ownerScope === "unassigned") return !company.owner_profile_id;
      return true;
    })
    .filter((company) => {
      if (!query) return true;
      const ownerName = getProfileLabel(ownerById.get(company.owner_profile_id ?? ""));
      return [company.display_name, company.primary_domain, company.primary_email ?? "", ownerName]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .map((company) => {
      const companyCases = filterOverviewCasesByStatus(
        typedCases.filter((caseRow) => caseRow.contact_company_id === company.id),
        statusFilter,
      ).sort(sortCasesNewestFirst);
      const activeCase = companyCases[0] ?? null;
      const activeChecklist = typedChecklist.filter((item) => item.case_id === activeCase?.id);
      const unreadCount = companyCases.reduce((count, caseRow) => {
        return count + typedMessages.filter((message) => message.case_id === caseRow.id && message.direction === "inbound" && !message.is_read).length;
      }, 0);
      return {
        company,
        activeCase,
        eventName: activeCase?.event_id ? eventNameById.get(activeCase.event_id) ?? null : null,
        latestMessageAt: activeCase?.latest_message_at ?? null,
        openCaseCount: companyCases.length,
        checklistCompleted: activeChecklist.filter((item) => item.is_completed).length,
        checklistTotal: activeChecklist.length,
        unreadCount,
        owner: ownerById.get(company.owner_profile_id ?? "") ?? null,
      } satisfies ContactOverviewListItem;
    })
    .filter((item) => item.activeCase !== null)
    .sort((a, b) => {
      const aTime = a.latestMessageAt ?? a.company.updated_at ?? a.company.created_at;
      const bTime = b.latestMessageAt ?? b.company.updated_at ?? b.company.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
}

export async function getContactOverviewMailboxSummary(): Promise<ContactOverviewMailboxSummary> {
  const { config, missingConfig } = getMailboxConfig();
  const delegatedUser = config?.delegatedUser ?? null;
  const syncState = delegatedUser ? await getMailboxSyncState(delegatedUser) : null;

  return {
    delegatedUser,
    configured: Boolean(config),
    missingConfig,
    lastSyncedAt: syncState?.last_synced_at ?? null,
    lastError: syncState?.last_error ?? null,
  };
}

export async function getContactOverviewCompanyDetail(
  contactCompanyId: string,
  selectedCaseId?: string | null,
  viewerProfileId?: string | null,
): Promise<ContactOverviewCompanyDetail | null> {
  const supabase = createAdminSupabaseClient();
  const [{ data: company }, { data: cases }, { data: events }, owners] = await Promise.all([
    supabase.from("email_contact_companies").select("*").eq("id", contactCompanyId).maybeSingle(),
    supabase.from("email_contact_cases").select("*").eq("contact_company_id", contactCompanyId),
    supabase.from("events").select("id, name").order("starts_at", { ascending: false }),
    listContactOverviewOwners(),
  ]);

  const typedCompany = company as ContactCompany | null;
  if (!typedCompany) return null;

  const typedCases = filterVisibleCases((cases ?? []) as ContactCase[]).sort(sortCasesNewestFirst);
  const activeCase =
    typedCases.find((caseRow) => caseRow.id === selectedCaseId) ??
    typedCases.find((caseRow) => caseRow.status === "open" || caseRow.status === "unsorted") ??
    typedCases[0] ??
    null;

  if (activeCase && viewerProfileId) {
    await markCaseMessagesRead(activeCase.id, viewerProfileId);
  }

  const visibleCaseIds = typedCases.map((caseRow) => caseRow.id);

  const [{ data: linkedCompany }, { data: messages }, { data: checklist }, { data: unreadMessages }] = await Promise.all([
    typedCompany.linked_company_id
      ? supabase.from("companies").select("*").eq("id", typedCompany.linked_company_id).maybeSingle()
      : Promise.resolve({ data: null }),
    activeCase
      ? supabase.from("email_contact_case_messages").select("*").eq("case_id", activeCase.id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    activeCase
      ? supabase.from("email_contact_case_checklist_items").select("*").eq("case_id", activeCase.id).order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    visibleCaseIds.length > 0
      ? supabase
          .from("email_contact_case_messages")
          .select("case_id, direction, is_read")
          .in("case_id", visibleCaseIds)
      : Promise.resolve({ data: [] }),
  ]);

  const typedMessages = (messages ?? []) as ContactMessage[];
  const typedOwners = owners as Profile[];
  const owner = typedOwners.find((profile) => profile.id === typedCompany.owner_profile_id) ?? null;
  const caseUnreadCounts = ((unreadMessages ?? []) as Array<Pick<ContactMessage, "case_id" | "direction" | "is_read">>)
    .filter((message) => message.direction === "inbound" && !message.is_read)
    .reduce<Record<string, number>>((counts, message) => {
      counts[message.case_id] = (counts[message.case_id] ?? 0) + 1;
      return counts;
    }, {});
  const unreadCount = Object.values(caseUnreadCounts).reduce((sum, count) => sum + count, 0);

  return {
    company: typedCompany,
    linkedCompany: (linkedCompany as Company | null) ?? null,
    cases: typedCases,
    activeCase,
    activeCaseMessages: typedMessages,
    activeCaseChecklist: (checklist ?? []) as ChecklistItem[],
    eventOptions: (events ?? []) as Event[],
    relatedCases: typedCases.filter((caseRow) => caseRow.id !== activeCase?.id),
    owners: typedOwners,
    owner,
    unreadCount,
    caseUnreadCounts,
  } satisfies ContactOverviewCompanyDetail;
}

export async function createManualContactCompany(input: {
  displayName: string;
  primaryDomain: string;
  primaryEmail?: string | null;
  eventId?: string | null;
  linkedCompanyId?: string | null;
  ownerProfileId?: string | null;
}) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const normalizedDomain = normalizeDomain(input.primaryDomain);
  const normalizedEmail = input.primaryEmail?.trim().toLowerCase() ?? null;
  if (!normalizedDomain) throw new Error("Domene er påkrevd.");

  const existing = await supabase
    .from("email_contact_companies")
    .select("*")
    .eq("primary_domain", normalizedDomain)
    .maybeSingle();
  if (existing.data) return existing.data as ContactCompany;

  const linkedCompanyId =
    input.linkedCompanyId ??
    (await loadMatchingContext()).companies.find((company) => {
      const host = tryParseUrlHost(company.website);
      return baseDomainCandidates(host).includes(normalizedDomain);
    })?.id ??
    null;

  const insert: TableInsert<"email_contact_companies"> = {
    display_name: normalizeWhitespace(input.displayName) || deriveCompanyNameFromDomain(normalizedDomain),
    primary_domain: normalizedDomain,
    primary_email: normalizedEmail,
    linked_company_id: linkedCompanyId,
    owner_profile_id: input.ownerProfileId ?? null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase.from("email_contact_companies").insert(insert).select("*").single();
  if (error || !data) throw new Error(error?.message || "Kunne ikke opprette kontaktbedrift.");

  const event = input.eventId
    ? ((await supabase.from("events").select("id, name").eq("id", input.eventId).maybeSingle()).data as Event | null)
    : null;
  await createContactCase({
    contactCompanyId: data.id,
    companyName: data.display_name,
    eventId: event?.id ?? null,
    eventName: event?.name ?? null,
    contactEmail: normalizedEmail,
    status: "open",
  });

  return data as ContactCompany;
}

export async function createManualContactCase(input: {
  contactCompanyId: string;
  eventId?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  title?: string | null;
  status?: CaseStatus;
}) {
  const supabase = createAdminSupabaseClient();
  const [{ data: company }, { data: event }] = await Promise.all([
    supabase.from("email_contact_companies").select("*").eq("id", input.contactCompanyId).single(),
    input.eventId ? supabase.from("events").select("id, name").eq("id", input.eventId).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return createContactCase({
    contactCompanyId: input.contactCompanyId,
    companyName: (company as ContactCompany).display_name,
    eventId: input.eventId ?? null,
    eventName: (event as Event | null)?.name ?? null,
    contactName: input.contactName ?? null,
    contactEmail: input.contactEmail ?? null,
    title: input.title ?? null,
    status: input.status ?? "open",
  });
}

export async function updateContactCase(input: {
  caseId: string;
  title: string;
  eventId?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  status?: CaseStatus;
}) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const update: TableUpdate<"email_contact_cases"> = {
    title: normalizeWhitespace(input.title),
    event_id: input.eventId ?? null,
    contact_name: normalizeWhitespace(input.contactName ?? "") || null,
    contact_email: input.contactEmail?.trim().toLowerCase() || null,
    status: input.status ?? "open",
    updated_at: now,
    archived_at: input.status === "archived" ? now : null,
    closed_at: input.status === "closed" ? now : null,
  };

  const { error } = await supabase
    .from("email_contact_cases")
    .update(update)
    .eq("id", input.caseId);
  if (error) throw new Error(error.message);
}

export async function toggleContactCaseChecklistItem(input: {
  itemId: string;
  completed: boolean;
  completedBy?: string | null;
}) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("email_contact_case_checklist_items")
    .update({
      is_completed: input.completed,
      completed_at: input.completed ? now : null,
      completed_by: input.completed ? (input.completedBy ?? null) : null,
      updated_at: now,
    })
    .eq("id", input.itemId);
  if (error) throw new Error(error.message);
}

export async function archiveContactCompany(contactCompanyId: string) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { error: companyError } = await supabase
    .from("email_contact_companies")
    .update({ archived_at: now, updated_at: now })
    .eq("id", contactCompanyId);
  if (companyError) throw new Error(companyError.message);

  const { error: caseError } = await supabase
    .from("email_contact_cases")
    .update({ archived_at: now, status: "archived", updated_at: now })
    .eq("contact_company_id", contactCompanyId);
  if (caseError) throw new Error(caseError.message);
}

export async function moveContactCaseMessage(input: {
  messageId: string;
  targetCaseId: string;
}) {
  const supabase = createAdminSupabaseClient();
  const { data: message } = await supabase
    .from("email_contact_case_messages")
    .select("*")
    .eq("id", input.messageId)
    .single();
  const typedMessage = message as ContactMessage | null;
  if (!typedMessage) throw new Error("Fant ikke melding.");

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("email_contact_case_messages")
    .update({
      case_id: input.targetCaseId,
      moved_from_case_id: typedMessage.case_id,
      updated_at: now,
    })
    .eq("id", input.messageId);
  if (error) throw new Error(error.message);

  const { error: targetError } = await supabase
    .from("email_contact_cases")
    .update({ latest_message_at: now, updated_at: now, status: "open" })
    .eq("id", input.targetCaseId);
  if (targetError) throw new Error(targetError.message);
}

export async function mergeContactCases(input: {
  sourceCaseId: string;
  targetCaseId: string;
}) {
  if (input.sourceCaseId === input.targetCaseId) {
    throw new Error("Kildesak og målsak kan ikke være den samme.");
  }

  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { error: messageError } = await supabase
    .from("email_contact_case_messages")
    .update({
      case_id: input.targetCaseId,
      moved_from_case_id: input.sourceCaseId,
      updated_at: now,
    })
    .eq("case_id", input.sourceCaseId);
  if (messageError) throw new Error(messageError.message);

  const { error: checklistError } = await supabase
    .from("email_contact_case_checklist_items")
    .delete()
    .eq("case_id", input.sourceCaseId);
  if (checklistError) throw new Error(checklistError.message);

  const { error: caseError } = await supabase
    .from("email_contact_cases")
    .update({
      status: "archived",
      archived_at: now,
      merged_into_case_id: input.targetCaseId,
      updated_at: now,
    })
    .eq("id", input.sourceCaseId);
  if (caseError) throw new Error(caseError.message);

  const { error: targetError } = await supabase
    .from("email_contact_cases")
    .update({ latest_message_at: now, updated_at: now, status: "open" })
    .eq("id", input.targetCaseId);
  if (targetError) throw new Error(targetError.message);
}

export function getChecklistLabel(itemKey: ChecklistKey) {
  return CHECKLIST_LABELS[itemKey];
}

export function summarizeMessageBody(message: ContactMessage) {
  const textBody = sanitizeMessageSummary(trimQuotedReply(message.body_text?.trim() ?? ""));
  if (textBody) return textBody;

  const htmlBody = sanitizeMessageSummary(trimQuotedReply(stripHtmlTags(message.body_html ?? "")));
  if (htmlBody) return htmlBody;

  return "Ingen tekst tilgjengelig.";
}

export function caseStatusLabel(status: CaseStatus) {
  if (status === "unsorted") return "Usortert";
  if (status === "open") return "Åpen";
  if (status === "closed") return "Lukket";
  return "Arkivert";
}

export function caseStatusVariant(status: CaseStatus): "default" | "info" | "warning" | "success" {
  if (status === "open") return "info";
  if (status === "unsorted") return "warning";
  if (status === "closed") return "success";
  return "default";
}

export function formatContactOverviewTimestamp(value: string | null | undefined) {
  const normalized = formatDateTime(value);
  if (!normalized) return "Ikke oppdatert";
  return new Date(normalized).toLocaleString("nb-NO");
}
