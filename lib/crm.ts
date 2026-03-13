import { createSign } from "node:crypto";

export const CRM_PIPELINE_STAGES = ["Kontaktet", "Venter svar", "Dialog", "Påmeldt", "Tapt"] as const;
export type CrmPipelineStage = (typeof CRM_PIPELINE_STAGES)[number];

const DEFAULT_LEAD_STATUSES = ["pending_approval", "waiting", "replied", "bounced", "edit_requested"] as const;

export type CrmLead = {
  rowNumber: number;
  leadId: string;
  company: string;
  contactName: string;
  contactEmail: string;
  subject: string;
  threadId: string;
  sourceMessageId: string;
  sentAtIso: string;
  sequenceStep: string;
  leadStatus: string;
  stopReason: string;
  snoozeUntilIso: string;
  companyChannelName: string;
  companyChannelId: string;
  companyStatus: CrmPipelineStage | "";
  eventName: string;
  temperature: string;
  pipelineValue: string;
  updatedAtIso: string;
  raw: Record<string, string>;
};

export type CrmLeadFilters = {
  query?: string;
  leadStatus?: string;
  companyStatus?: string;
  eventName?: string;
  temperature?: string;
  stopReason?: string;
  sequenceStep?: string;
};

export type CrmCompanyCard = {
  key: string;
  company: string;
  eventName: string;
  pipelineStage: CrmPipelineStage;
  companyChannelName: string;
  companyChannelId: string;
  totalContacts: number;
  openLeadCount: number;
  waitingReplyCount: number;
  repliedCount: number;
  pipelineValueTotal: number;
  lastSentAtIso: string;
  lastUpdatedAtIso: string;
  leadIds: string[];
};

export type CrmMetrics = {
  totalLeads: number;
  totalCompanies: number;
  missingReplies: number;
  dialogueCompanies: number;
  signedCompanies: number;
  lostCompanies: number;
  pipelineTotal: number;
};

export type CrmDataset = {
  fetchedAt: string;
  sheetId: string;
  sheetRange: string;
  headers: string[];
  leads: CrmLead[];
  companyCards: CrmCompanyCard[];
  missingReplyLeads: CrmLead[];
  options: {
    leadStatuses: string[];
    companyStatuses: CrmPipelineStage[];
    events: string[];
    temperatures: string[];
    stopReasons: string[];
    sequenceSteps: string[];
  };
  metrics: CrmMetrics;
};

type RawSheetResponse = {
  values?: Array<Array<string | number | boolean | null>>;
  error?: { message?: string };
};

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type AuthConfig =
  | { mode: "apiKey"; apiKey: string }
  | { mode: "serviceAccount"; clientEmail: string; privateKey: string }
  | { mode: "publicGviz" };

type CanonicalField =
  | "leadId"
  | "company"
  | "contactName"
  | "contactEmail"
  | "subject"
  | "threadId"
  | "sourceMessageId"
  | "sentAtIso"
  | "sequenceStep"
  | "leadStatus"
  | "stopReason"
  | "snoozeUntilIso"
  | "companyChannelName"
  | "companyChannelId"
  | "companyStatus"
  | "eventName"
  | "temperature"
  | "pipelineValue"
  | "updatedAtIso";

const fieldAliases: Record<CanonicalField, string[]> = {
  leadId: ["leadid", "lead id", "id"],
  company: ["company", "bedrift", "organization", "organisasjon"],
  contactName: ["contactname", "contact name", "name", "full name", "navn"],
  contactEmail: ["contactemail", "contact email", "email", "epost", "e post"],
  subject: ["subject", "emne"],
  threadId: ["threadid", "thread id", "gmail thread"],
  sourceMessageId: ["sourcemessageid", "source message id", "message id"],
  sentAtIso: ["sentatiso", "sent at", "sent at iso", "sent"],
  sequenceStep: ["sequencestep", "sequence step", "step"],
  leadStatus: ["leadstatus", "lead status", "status"],
  stopReason: ["stopreason", "stop reason", "reason"],
  snoozeUntilIso: ["snoozeuntiliso", "snooze until", "snooze"],
  companyChannelName: ["companychannelname", "company channel name", "channel name", "discord channel"],
  companyChannelId: ["companychannelid", "company channel id", "channel id", "discord channel id"],
  companyStatus: ["companystatus", "company status", "pipeline stage", "stage"],
  eventName: ["event", "eventname", "event name"],
  temperature: ["temperature"],
  pipelineValue: ["pipelinevalue", "pipeline value", "value"],
  updatedAtIso: ["updatedatiso", "updated at", "updated"],
};

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function parseSheetId(input: string) {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] ?? trimmed;
}

function parseSheetNameFromRange(range: string) {
  const [rawName] = range.split("!");
  if (!rawName) return "Sheet1";
  return rawName.replace(/^'+|'+$/g, "").trim() || "Sheet1";
}

function escapeSheetName(name: string) {
  if (/^[A-Za-z0-9_]+$/.test(name)) return name;
  return `'${name.replace(/'/g, "''")}'`;
}

function normalizeRangePart(rangePart: string) {
  const trimmed = rangePart.trim();
  if (!trimmed) return "A:ZZ";

  const missingEndRowMatch = trimmed.match(/^([A-Za-z]+)\d+:([A-Za-z]+)$/);
  if (missingEndRowMatch) {
    return `${missingEndRowMatch[1].toUpperCase()}:${missingEndRowMatch[2].toUpperCase()}`;
  }

  return trimmed;
}

function normalizeSheetRange(range: string) {
  const sheetName = parseSheetNameFromRange(range);
  const rangePart = range.includes("!") ? range.slice(range.indexOf("!") + 1) : "";
  return `${escapeSheetName(sheetName)}!${normalizeRangePart(rangePart)}`;
}

function getSheetConfig() {
  const sheetIdRaw = process.env.CRM_GOOGLE_SHEET_ID;
  const sheetNameFromEnv = process.env.CRM_GOOGLE_SHEET_NAME?.trim();
  const rawSheetRange = process.env.CRM_GOOGLE_SHEET_RANGE?.trim() ?? "";
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY?.trim();
  const serviceAccountEmail = process.env.CRM_GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const serviceAccountPrivateKey = process.env.CRM_GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!sheetIdRaw) {
    throw new Error("Missing CRM_GOOGLE_SHEET_ID. Set sheet ID or full Google Sheet URL in env.");
  }

  let auth: AuthConfig | null = null;
  if (serviceAccountEmail && serviceAccountPrivateKey) {
    auth = {
      mode: "serviceAccount",
      clientEmail: serviceAccountEmail,
      privateKey: serviceAccountPrivateKey,
    };
  } else if (apiKey) {
    auth = {
      mode: "apiKey",
      apiKey,
    };
  } else {
    auth = {
      mode: "publicGviz",
    };
  }

  const sheetName =
    (sheetNameFromEnv ? parseSheetNameFromRange(`${sheetNameFromEnv}!A:ZZ`) : "") ||
    parseSheetNameFromRange(rawSheetRange || "OSH CRM Leads!A:ZZ");
  const normalizedSheetRange = normalizeSheetRange(
    rawSheetRange || `${sheetName}!A:ZZ`,
  );

  return {
    sheetId: parseSheetId(sheetIdRaw),
    auth: auth as AuthConfig,
    sheetRange: normalizedSheetRange,
    sheetName,
    sheetReadRange: escapeSheetName(sheetName),
  };
}

function toBase64Url(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

let cachedGoogleToken: { token: string; expiresAt: number } | null = null;

async function getServiceAccountAccessToken(auth: Extract<AuthConfig, { mode: "serviceAccount" }>) {
  if (cachedGoogleToken && cachedGoogleToken.expiresAt > Date.now() + 30_000) {
    return cachedGoogleToken.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = toBase64Url(
    JSON.stringify({
      iss: auth.clientEmail,
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );

  const unsignedToken = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const signature = signer
    .sign(auth.privateKey, "base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  const assertion = `${unsignedToken}.${signature}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });

  const tokenBody = (await tokenResponse.json().catch(() => ({}))) as GoogleTokenResponse;
  if (!tokenResponse.ok || !tokenBody.access_token) {
    const message =
      tokenBody.error_description ||
      tokenBody.error ||
      "Failed to authenticate with Google service account.";
    throw new Error(message);
  }

  const expiresInMs = (tokenBody.expires_in ?? 3600) * 1000;
  cachedGoogleToken = {
    token: tokenBody.access_token,
    expiresAt: Date.now() + expiresInMs,
  };

  return tokenBody.access_token;
}

function toCellString(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function findFieldIndex(headers: string[], field: CanonicalField) {
  const normalizedHeaders = headers.map((header) => normalizeText(header));
  const aliases = fieldAliases[field].map((alias) => normalizeText(alias));

  for (let index = 0; index < normalizedHeaders.length; index += 1) {
    const header = normalizedHeaders[index];
    if (!header) continue;
    if (aliases.some((alias) => header === alias || header.includes(alias))) {
      return index;
    }
  }

  return -1;
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "nb-NO", { sensitivity: "base" }),
  );
}

function orderLeadStatuses(values: string[]) {
  const seen = new Set(values.filter(Boolean));
  const ordered = DEFAULT_LEAD_STATUSES.filter((value) => seen.has(value));
  const extra = uniqueSorted(values).filter((value) => !ordered.includes(value as (typeof DEFAULT_LEAD_STATUSES)[number]));
  return [...ordered, ...extra];
}

function parseNumber(value: string) {
  if (!value.trim()) return 0;
  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateToMillis(value: string) {
  if (!value.trim()) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasStatus(value: string, pattern: string) {
  return normalizeText(value) === normalizeText(pattern);
}

function parseGvizRows(text: string) {
  const marker = "setResponse(";
  const start = text.indexOf(marker);
  if (start < 0) {
    throw new Error("Could not parse Google gviz response.");
  }

  const jsonStart = start + marker.length;
  const endWithSemicolon = text.lastIndexOf(");");
  const endWithParen = text.lastIndexOf(")");
  const jsonEnd =
    endWithSemicolon >= jsonStart
      ? endWithSemicolon
      : endWithParen >= jsonStart
        ? endWithParen
        : -1;

  if (jsonEnd < jsonStart) {
    throw new Error("Could not parse Google gviz response.");
  }

  const payload = text.slice(jsonStart, jsonEnd).trim();
  const parsed = JSON.parse(payload) as {
    status?: string;
    table?: {
      rows?: Array<{ c?: Array<{ v?: string | number | boolean | null } | null> }>;
    };
  };

  if (parsed.status && parsed.status !== "ok") {
    throw new Error(`Google gviz status: ${parsed.status}`);
  }

  const gvizRows = parsed.table?.rows ?? [];
  return gvizRows.map((row) => (row.c ?? []).map((cell) => toCellString(cell?.v ?? "")));
}

export function normalizePipelineStage(value: string): CrmPipelineStage | "" {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  if (normalized.includes("pameld") || normalized.includes("won") || normalized.includes("signed") || normalized.includes("registered")) {
    return "Påmeldt";
  }
  if (normalized.includes("dialog")) return "Dialog";
  if (normalized === "venter svar" || normalized === "waiting" || normalized === "awaiting reply") {
    return "Venter svar";
  }
  if (normalized.includes("closed lost") || normalized === "tapt" || normalized === "lost") {
    return "Tapt";
  }
  if (normalized.includes("contacted") || normalized.includes("kontaktet")) {
    return "Kontaktet";
  }
  return "Kontaktet";
}

function normalizeLeadStatus(value: string) {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  if (normalized === "pending approval") return "pending_approval";
  if (normalized === "edit requested") return "edit_requested";
  if (normalized === "waiting") return "waiting";
  if (normalized === "replied") return "replied";
  if (normalized === "bounced") return "bounced";
  return value.trim();
}

function isLeadClosed(lead: CrmLead) {
  const leadStatus = normalizeText(lead.leadStatus);
  const stopReason = normalizeText(lead.stopReason);
  return leadStatus === "replied" || leadStatus === "bounced" || stopReason === "replied" || stopReason === "bounced";
}

function isFutureIso(value: string) {
  const time = dateToMillis(value);
  return time > Date.now();
}

export function isLeadMissingReply(lead: CrmLead) {
  return normalizeText(lead.leadStatus) === "waiting" && !isFutureIso(lead.snoozeUntilIso);
}

export function getLeadAgeInDays(lead: CrmLead) {
  const sourceTime = dateToMillis(lead.sentAtIso) || dateToMillis(lead.updatedAtIso);
  if (!sourceTime) return 0;
  return Math.max(0, Math.floor((Date.now() - sourceTime) / 86_400_000));
}

export function getMissingReplyLeads(leads: CrmLead[]) {
  return leads
    .filter(isLeadMissingReply)
    .sort((a, b) => {
      const sentDiff = dateToMillis(a.sentAtIso) - dateToMillis(b.sentAtIso);
      if (sentDiff !== 0) return sentDiff;
      return dateToMillis(a.updatedAtIso) - dateToMillis(b.updatedAtIso);
    });
}

function resolvePipelineStage(leads: CrmLead[]) {
  const explicitStages = new Set(leads.map((lead) => lead.companyStatus).filter(Boolean));
  for (const stage of ["Påmeldt", "Dialog", "Venter svar", "Kontaktet", "Tapt"] as const) {
    if (explicitStages.has(stage)) return stage;
  }

  if (leads.some((lead) => isLeadMissingReply(lead))) return "Venter svar";
  if (leads.some((lead) => normalizeText(lead.leadStatus) === "replied")) return "Dialog";
  if (leads.some((lead) => normalizeText(lead.leadStatus) === "bounced")) return "Tapt";
  return "Kontaktet";
}

export function buildCrmCompanyCards(leads: CrmLead[]) {
  const grouped = new Map<
    string,
    {
      company: string;
      eventName: string;
      companyChannelName: string;
      companyChannelId: string;
      leads: CrmLead[];
      totalContacts: number;
      openLeadCount: number;
      waitingReplyCount: number;
      repliedCount: number;
      pipelineValueTotal: number;
      lastSentAtIso: string;
      lastUpdatedAtIso: string;
      leadIds: string[];
    }
  >();

  for (const lead of leads) {
    const key = `${normalizeText(lead.company)}::${normalizeText(lead.eventName)}`;
    const current = grouped.get(key) ?? {
      company: lead.company,
      eventName: lead.eventName,
      companyChannelName: lead.companyChannelName,
      companyChannelId: lead.companyChannelId,
      leads: [],
      totalContacts: 0,
      openLeadCount: 0,
      waitingReplyCount: 0,
      repliedCount: 0,
      pipelineValueTotal: 0,
      lastSentAtIso: "",
      lastUpdatedAtIso: "",
      leadIds: [],
    };

    current.leads.push(lead);
    current.totalContacts += 1;
    if (!isLeadClosed(lead)) current.openLeadCount += 1;
    if (isLeadMissingReply(lead)) current.waitingReplyCount += 1;
    if (normalizeText(lead.leadStatus) === "replied") current.repliedCount += 1;
    current.pipelineValueTotal += parseNumber(lead.pipelineValue);
    if (!current.companyChannelName && lead.companyChannelName) current.companyChannelName = lead.companyChannelName;
    if (!current.companyChannelId && lead.companyChannelId) current.companyChannelId = lead.companyChannelId;
    if (dateToMillis(lead.sentAtIso) > dateToMillis(current.lastSentAtIso)) current.lastSentAtIso = lead.sentAtIso;
    if (dateToMillis(lead.updatedAtIso) > dateToMillis(current.lastUpdatedAtIso)) current.lastUpdatedAtIso = lead.updatedAtIso;
    current.leadIds.push(lead.leadId);

    grouped.set(key, current);
  }

  return Array.from(grouped.entries())
    .map(([key, value]) => ({
      key,
      company: value.company,
      eventName: value.eventName,
      pipelineStage: resolvePipelineStage(value.leads),
      companyChannelName: value.companyChannelName,
      companyChannelId: value.companyChannelId,
      totalContacts: value.totalContacts,
      openLeadCount: value.openLeadCount,
      waitingReplyCount: value.waitingReplyCount,
      repliedCount: value.repliedCount,
      pipelineValueTotal: value.pipelineValueTotal,
      lastSentAtIso: value.lastSentAtIso,
      lastUpdatedAtIso: value.lastUpdatedAtIso,
      leadIds: value.leadIds,
    }))
    .sort((a, b) => {
      const pipelineDiff = CRM_PIPELINE_STAGES.indexOf(a.pipelineStage) - CRM_PIPELINE_STAGES.indexOf(b.pipelineStage);
      if (pipelineDiff !== 0) return pipelineDiff;
      return dateToMillis(b.lastUpdatedAtIso) - dateToMillis(a.lastUpdatedAtIso);
    });
}

function buildMetrics(leads: CrmLead[]): CrmMetrics {
  const companyCards = buildCrmCompanyCards(leads);

  return {
    totalLeads: leads.length,
    totalCompanies: companyCards.length,
    missingReplies: getMissingReplyLeads(leads).length,
    dialogueCompanies: companyCards.filter((card) => card.pipelineStage === "Dialog").length,
    signedCompanies: companyCards.filter((card) => card.pipelineStage === "Påmeldt").length,
    lostCompanies: companyCards.filter((card) => card.pipelineStage === "Tapt").length,
    pipelineTotal: leads.reduce((acc, lead) => acc + parseNumber(lead.pipelineValue), 0),
  };
}

export function applyCrmLeadFilters(leads: CrmLead[], filters: CrmLeadFilters) {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const leadStatus = filters.leadStatus?.trim() ?? "";
  const companyStatus = filters.companyStatus?.trim() ?? "";
  const eventName = filters.eventName?.trim() ?? "";
  const temperature = filters.temperature?.trim() ?? "";
  const stopReason = filters.stopReason?.trim() ?? "";
  const sequenceStep = filters.sequenceStep?.trim() ?? "";

  return leads.filter((lead) => {
    if (leadStatus && leadStatus !== "all" && !hasStatus(lead.leadStatus, leadStatus)) {
      return false;
    }

    if (companyStatus && companyStatus !== "all" && !hasStatus(lead.companyStatus, companyStatus)) {
      return false;
    }

    if (eventName && eventName !== "all" && !hasStatus(lead.eventName, eventName)) {
      return false;
    }

    if (temperature && temperature !== "all" && !hasStatus(lead.temperature, temperature)) {
      return false;
    }

    if (stopReason && stopReason !== "all" && !hasStatus(lead.stopReason, stopReason)) {
      return false;
    }

    if (sequenceStep && sequenceStep !== "all" && !hasStatus(lead.sequenceStep, sequenceStep)) {
      return false;
    }

    if (!query) return true;

    const searchable = [
      lead.leadId,
      lead.company,
      lead.contactName,
      lead.contactEmail,
      lead.subject,
      lead.threadId,
      lead.sourceMessageId,
      lead.leadStatus,
      lead.companyStatus,
      lead.stopReason,
      lead.sequenceStep,
      lead.companyChannelName,
      lead.companyChannelId,
      lead.eventName,
      lead.temperature,
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(query);
  });
}

export async function loadCrmDataset(): Promise<CrmDataset> {
  const config = getSheetConfig();
  let rows: string[][] = [];

  if (config.auth.mode === "publicGviz") {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(config.sheetId)}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(config.sheetName)}`;
    const response = await fetch(gvizUrl, {
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch public Google Sheet gviz data.");
    }

    const text = await response.text();
    rows = parseGvizRows(text);
  } else {
    const encodedRange = encodeURIComponent(config.sheetReadRange);
    const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.sheetId)}/values/${encodedRange}?majorDimension=ROWS`;

    const headers: HeadersInit = {};
    const requestUrl =
      config.auth.mode === "apiKey"
        ? `${baseUrl}&key=${encodeURIComponent(config.auth.apiKey)}`
        : baseUrl;

    if (config.auth.mode === "serviceAccount") {
      const accessToken = await getServiceAccountAccessToken(config.auth);
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(requestUrl, {
      cache: "no-store",
      next: { revalidate: 0 },
      headers,
    });

    const body = (await response.json().catch(() => ({}))) as RawSheetResponse;

    if (!response.ok) {
      throw new Error(body.error?.message ?? "Failed to fetch CRM Google Sheet.");
    }

    rows = (body.values ?? []).map((row) => row.map((cell) => toCellString(cell)));
  }

  if (rows.length === 0) {
    return {
      fetchedAt: new Date().toISOString(),
      sheetId: config.sheetId,
      sheetRange: config.sheetRange,
      headers: [],
      leads: [],
      companyCards: [],
      missingReplyLeads: [],
      options: {
        leadStatuses: [...DEFAULT_LEAD_STATUSES],
        companyStatuses: [...CRM_PIPELINE_STAGES],
        events: [],
        temperatures: [],
        stopReasons: [],
        sequenceSteps: [],
      },
      metrics: {
        totalLeads: 0,
        totalCompanies: 0,
        missingReplies: 0,
        dialogueCompanies: 0,
        signedCompanies: 0,
        lostCompanies: 0,
        pipelineTotal: 0,
      },
    };
  }

  const headerRow = rows[0].map((value) => toCellString(value));
  const dataRows = rows.slice(1);

  const indexByField: Record<CanonicalField, number> = {
    leadId: findFieldIndex(headerRow, "leadId"),
    company: findFieldIndex(headerRow, "company"),
    contactName: findFieldIndex(headerRow, "contactName"),
    contactEmail: findFieldIndex(headerRow, "contactEmail"),
    subject: findFieldIndex(headerRow, "subject"),
    threadId: findFieldIndex(headerRow, "threadId"),
    sourceMessageId: findFieldIndex(headerRow, "sourceMessageId"),
    sentAtIso: findFieldIndex(headerRow, "sentAtIso"),
    sequenceStep: findFieldIndex(headerRow, "sequenceStep"),
    leadStatus: findFieldIndex(headerRow, "leadStatus"),
    stopReason: findFieldIndex(headerRow, "stopReason"),
    snoozeUntilIso: findFieldIndex(headerRow, "snoozeUntilIso"),
    companyChannelName: findFieldIndex(headerRow, "companyChannelName"),
    companyChannelId: findFieldIndex(headerRow, "companyChannelId"),
    companyStatus: findFieldIndex(headerRow, "companyStatus"),
    eventName: findFieldIndex(headerRow, "eventName"),
    temperature: findFieldIndex(headerRow, "temperature"),
    pipelineValue: findFieldIndex(headerRow, "pipelineValue"),
    updatedAtIso: findFieldIndex(headerRow, "updatedAtIso"),
  };

  function readField(row: Array<string | number | boolean | null>, field: CanonicalField) {
    const index = indexByField[field];
    if (index < 0 || index >= row.length) return "";
    return toCellString(row[index]);
  }

  const leads = dataRows
    .map((row, index) => {
      const raw: Record<string, string> = {};
      headerRow.forEach((header, headerIndex) => {
        const key = header || `column_${headerIndex + 1}`;
        raw[key] = toCellString(row[headerIndex]);
      });

      const leadId = readField(row, "leadId") || `row-${index + 2}`;

      return {
        rowNumber: index + 2,
        leadId,
        company: readField(row, "company"),
        contactName: readField(row, "contactName"),
        contactEmail: readField(row, "contactEmail"),
        subject: readField(row, "subject"),
        threadId: readField(row, "threadId"),
        sourceMessageId: readField(row, "sourceMessageId"),
        sentAtIso: readField(row, "sentAtIso"),
        sequenceStep: readField(row, "sequenceStep"),
        leadStatus: normalizeLeadStatus(readField(row, "leadStatus")),
        stopReason: readField(row, "stopReason"),
        snoozeUntilIso: readField(row, "snoozeUntilIso"),
        companyChannelName: readField(row, "companyChannelName"),
        companyChannelId: readField(row, "companyChannelId"),
        companyStatus: normalizePipelineStage(readField(row, "companyStatus")),
        eventName: readField(row, "eventName"),
        temperature: readField(row, "temperature"),
        pipelineValue: readField(row, "pipelineValue"),
        updatedAtIso: readField(row, "updatedAtIso"),
        raw,
      } satisfies CrmLead;
    })
    .filter((lead) => {
      if (lead.leadId) return true;
      if (lead.contactEmail) return true;
      if (lead.contactName) return true;
      if (lead.company) return true;
      return false;
    })
    .sort((a, b) => {
      const updatedDiff = dateToMillis(b.updatedAtIso) - dateToMillis(a.updatedAtIso);
      if (updatedDiff !== 0) return updatedDiff;
      return dateToMillis(b.sentAtIso) - dateToMillis(a.sentAtIso);
    });

  return {
    fetchedAt: new Date().toISOString(),
    sheetId: config.sheetId,
    sheetRange: config.sheetRange,
    headers: headerRow,
    leads,
    companyCards: buildCrmCompanyCards(leads),
    missingReplyLeads: getMissingReplyLeads(leads),
    options: {
      leadStatuses: orderLeadStatuses(leads.map((lead) => lead.leadStatus)),
      companyStatuses: [...CRM_PIPELINE_STAGES],
      events: uniqueSorted(leads.map((lead) => lead.eventName)),
      temperatures: uniqueSorted(leads.map((lead) => lead.temperature)),
      stopReasons: uniqueSorted(leads.map((lead) => lead.stopReason)),
      sequenceSteps: uniqueSorted(leads.map((lead) => lead.sequenceStep)),
    },
    metrics: buildMetrics(leads),
  };
}

export function buildCrmMetrics(leads: CrmLead[]) {
  return buildMetrics(leads);
}
