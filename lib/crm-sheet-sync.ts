import { createSign } from "node:crypto";

export type CrmSyncField =
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

export type CrmSyncInput = {
  leadId: string;
  updates: Partial<Record<CrmSyncField, string>>;
};

export type CrmCompanySyncInput = {
  company: string;
  eventName: string;
  updates: Partial<Record<CrmSyncField, string>>;
};

type SheetValuesResponse = {
  values?: Array<Array<string | number | boolean | null>>;
  error?: { message?: string };
};

type SheetWriteResponse = {
  updates?: {
    updatedRange?: string;
  };
  error?: { message?: string };
};

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

const headerByField: Record<CrmSyncField | "leadId", string> = {
  leadId: "LeadID",
  company: "Company",
  contactName: "ContactName",
  contactEmail: "ContactEmail",
  subject: "Subject",
  threadId: "ThreadID",
  sourceMessageId: "SourceMessageID",
  sentAtIso: "SentAtISO",
  sequenceStep: "SequenceStep",
  leadStatus: "LeadStatus",
  stopReason: "StopReason",
  snoozeUntilIso: "SnoozeUntilISO",
  companyChannelName: "CompanyChannelName",
  companyChannelId: "CompanyChannelID",
  companyStatus: "CompanyStatus",
  eventName: "Event",
  temperature: "Temperature",
  pipelineValue: "PipelineValue",
  updatedAtIso: "UpdatedAtISO",
};

type Config = {
  sheetId: string;
  sheetName: string;
  clientEmail: string;
  privateKey: string;
};

type SheetSnapshot = {
  config: Config;
  accessToken: string;
  escapedSheetName: string;
  headers: string[];
  dataRows: string[][];
};

let cachedGoogleToken: { token: string; expiresAt: number } | null = null;

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

function toCellString(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) return "";
  return String(value);
}

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

function findHeaderIndex(headers: string[], headerName: string) {
  const target = normalizeText(headerName);
  for (let index = 0; index < headers.length; index += 1) {
    if (normalizeText(headers[index]) === target) return index;
  }
  return -1;
}

function toBase64Url(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function escapeSheetName(name: string) {
  if (/^[A-Za-z0-9_]+$/.test(name)) return name;
  return `'${name.replace(/'/g, "''")}'`;
}

function columnLabelFromIndex(index: number) {
  let n = index;
  let label = "";
  while (n >= 0) {
    label = String.fromCharCode((n % 26) + 65) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label || "A";
}

function getSyncConfig(): Config {
  const sheetIdRaw = process.env.CRM_GOOGLE_SHEET_ID;
  const sheetNameFromEnv = process.env.CRM_GOOGLE_SHEET_NAME?.trim();
  const sheetRange = process.env.CRM_GOOGLE_SHEET_RANGE?.trim() ?? "";
  const clientEmail = process.env.CRM_GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.CRM_GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!sheetIdRaw) {
    throw new Error("Missing CRM_GOOGLE_SHEET_ID");
  }
  if (!clientEmail || !privateKey) {
    throw new Error("Missing CRM_GOOGLE_SERVICE_ACCOUNT_EMAIL and/or CRM_GOOGLE_PRIVATE_KEY for sheet sync");
  }

  const sheetName =
    (sheetNameFromEnv ? parseSheetNameFromRange(`${sheetNameFromEnv}!A:ZZ`) : "") ||
    parseSheetNameFromRange(sheetRange || "OSH CRM Leads!A:ZZ");

  return {
    sheetId: parseSheetId(sheetIdRaw),
    sheetName,
    clientEmail,
    privateKey,
  };
}

async function getServiceAccountAccessToken(config: Config) {
  if (cachedGoogleToken && cachedGoogleToken.expiresAt > Date.now() + 30_000) {
    return cachedGoogleToken.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = toBase64Url(
    JSON.stringify({
      iss: config.clientEmail,
      scope: "https://www.googleapis.com/auth/spreadsheets",
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
    .sign(config.privateKey, "base64")
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
    throw new Error(tokenBody.error_description || tokenBody.error || "Failed to get Google access token");
  }

  cachedGoogleToken = {
    token: tokenBody.access_token,
    expiresAt: Date.now() + (tokenBody.expires_in ?? 3600) * 1000,
  };

  return tokenBody.access_token;
}

async function fetchSheetValues(config: Config, accessToken: string, rangeA1: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.sheetId)}/values/${encodeURIComponent(rangeA1)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  const body = (await response.json().catch(() => ({}))) as SheetValuesResponse;
  if (!response.ok) {
    throw new Error(body.error?.message ?? "Failed to fetch Google Sheet values");
  }

  return (body.values ?? []).map((row) => row.map((cell) => toCellString(cell)));
}

async function updateSheetRow(config: Config, accessToken: string, rangeA1: string, values: string[]) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.sheetId)}/values/${encodeURIComponent(rangeA1)}?valueInputOption=USER_ENTERED`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      majorDimension: "ROWS",
      values: [values],
    }),
    cache: "no-store",
  });

  const body = (await response.json().catch(() => ({}))) as SheetWriteResponse;
  if (!response.ok) {
    throw new Error(body.error?.message ?? "Failed to update Google Sheet row");
  }
}

async function loadSheetSnapshot(): Promise<SheetSnapshot> {
  const config = getSyncConfig();
  const accessToken = await getServiceAccountAccessToken(config);
  const escapedSheetName = escapeSheetName(config.sheetName);
  const fullSheetRange = escapedSheetName;
  const allRows = await fetchSheetValues(config, accessToken, fullSheetRange);
  const headers = allRows[0] ?? [];
  if (headers.length === 0) {
    throw new Error("Sheet header row is empty");
  }

  return {
    config,
    accessToken,
    escapedSheetName,
    headers,
    dataRows: allRows.slice(1),
  };
}

function buildRowValues(headers: string[], baseRow: string[] = []) {
  const rowValues = [...baseRow];
  while (rowValues.length < headers.length) rowValues.push("");
  return rowValues;
}

function assignField(headers: string[], rowValues: string[], field: CrmSyncField | "leadId", value: string) {
  const index = findHeaderIndex(headers, headerByField[field]);
  if (index < 0) return;
  rowValues[index] = value;
}

function applyUpdates(headers: string[], rowValues: string[], updates: Partial<Record<CrmSyncField, string>>) {
  (Object.entries(updates) as Array<[CrmSyncField, string | undefined]>).forEach(([field, value]) => {
    if (value === undefined) return;
    assignField(headers, rowValues, field, value);
  });

  if (!updates.updatedAtIso) {
    assignField(headers, rowValues, "updatedAtIso", new Date().toISOString());
  }
}

export async function syncLeadToGoogleSheet(input: CrmSyncInput) {
  const snapshot = await loadSheetSnapshot();
  const leadIdIndex = findHeaderIndex(snapshot.headers, headerByField.leadId);
  if (leadIdIndex < 0) {
    throw new Error("Could not find LeadID column in sheet");
  }

  const normalizedLeadId = input.leadId.trim().toLowerCase();
  const existingDataIndex = snapshot.dataRows.findIndex((row) =>
    toCellString(row[leadIdIndex]).trim().toLowerCase() === normalizedLeadId,
  );

  const rowValues = buildRowValues(
    snapshot.headers,
    existingDataIndex >= 0 ? snapshot.dataRows[existingDataIndex] : [],
  );

  assignField(snapshot.headers, rowValues, "leadId", input.leadId);
  applyUpdates(snapshot.headers, rowValues, input.updates);

  if (existingDataIndex >= 0) {
    const rowNumber = existingDataIndex + 2;
    const endCol = columnLabelFromIndex(Math.max(snapshot.headers.length - 1, 0));
    const rowRange = `${snapshot.escapedSheetName}!A${rowNumber}:${endCol}${rowNumber}`;
    await updateSheetRow(snapshot.config, snapshot.accessToken, rowRange, rowValues);

    return {
      mode: "updated" as const,
      rowNumber,
      leadId: input.leadId,
    };
  }

  const rowNumber = snapshot.dataRows.length + 2;
  const endCol = columnLabelFromIndex(Math.max(snapshot.headers.length - 1, 0));
  const rowRange = `${snapshot.escapedSheetName}!A${rowNumber}:${endCol}${rowNumber}`;
  await updateSheetRow(snapshot.config, snapshot.accessToken, rowRange, rowValues);

  return {
    mode: "appended" as const,
    rowNumber,
    leadId: input.leadId,
  };
}

export async function syncCompanyEventToGoogleSheet(input: CrmCompanySyncInput) {
  if (!input.company.trim()) {
    throw new Error("Company is required for company pipeline sync");
  }

  const snapshot = await loadSheetSnapshot();
  const companyIndex = findHeaderIndex(snapshot.headers, headerByField.company);
  const eventIndex = findHeaderIndex(snapshot.headers, headerByField.eventName);

  if (companyIndex < 0) {
    throw new Error("Could not find Company column in sheet");
  }
  if (eventIndex < 0) {
    throw new Error("Could not find Event column in sheet");
  }

  const normalizedCompany = normalizeText(input.company);
  const normalizedEvent = normalizeText(input.eventName);

  const matchingRowIndexes = snapshot.dataRows.reduce<number[]>((acc, row, index) => {
    const rowCompany = normalizeText(toCellString(row[companyIndex]));
    const rowEvent = normalizeText(toCellString(row[eventIndex]));
    if (rowCompany === normalizedCompany && rowEvent === normalizedEvent) {
      acc.push(index);
    }
    return acc;
  }, []);

  if (matchingRowIndexes.length === 0) {
    throw new Error("Could not find any sheet rows for the selected company and event");
  }

  const endCol = columnLabelFromIndex(Math.max(snapshot.headers.length - 1, 0));
  const rowNumbers: number[] = [];

  for (const dataIndex of matchingRowIndexes) {
    const rowNumber = dataIndex + 2;
    const rowValues = buildRowValues(snapshot.headers, snapshot.dataRows[dataIndex]);
    applyUpdates(snapshot.headers, rowValues, input.updates);

    const rowRange = `${snapshot.escapedSheetName}!A${rowNumber}:${endCol}${rowNumber}`;
    await updateSheetRow(snapshot.config, snapshot.accessToken, rowRange, rowValues);
    rowNumbers.push(rowNumber);
  }

  return {
    mode: "batch-updated" as const,
    rowNumbers,
    company: input.company,
    eventName: input.eventName,
  };
}
