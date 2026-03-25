import { createSign } from "node:crypto";

const GMAIL_READ_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

type GmailWorkspaceConfig = {
  serviceAccountEmail: string;
  privateKey: string;
  delegatedUser: string;
  testRecipient: string;
};

export type GmailFeasibilityResult = {
  configured: boolean;
  missingConfig: string[];
  delegatedUser: string | null;
  testRecipient: string | null;
  goNoGo: "go" | "no-go";
  readThreads: {
    ok: boolean;
    count?: number;
    threadIds?: string[];
    error?: string;
  };
  sendMail: {
    ok: boolean;
    messageId?: string;
    error?: string;
  };
  notes: string[];
};

function toBase64Url(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function normalizePrivateKey(value: string | undefined) {
  return value?.replace(/\\n/g, "\n").trim() ?? "";
}

function getConfig() {
  const serviceAccountEmail =
    process.env.GMAIL_WORKSPACE_SERVICE_ACCOUNT_EMAIL?.trim() ||
    process.env.CRM_GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() ||
    "";
  const privateKey =
    normalizePrivateKey(process.env.GMAIL_WORKSPACE_PRIVATE_KEY) ||
    normalizePrivateKey(process.env.CRM_GOOGLE_PRIVATE_KEY);
  const delegatedUser =
    process.env.GMAIL_WORKSPACE_DELEGATED_USER?.trim() ||
    "stian@oslostudenthub.no";
  const testRecipient =
    process.env.GMAIL_WORKSPACE_TEST_TO?.trim() ||
    "stian@oslostudenthub.no";

  const missingConfig: string[] = [];
  if (!serviceAccountEmail) missingConfig.push("GMAIL_WORKSPACE_SERVICE_ACCOUNT_EMAIL");
  if (!privateKey) missingConfig.push("GMAIL_WORKSPACE_PRIVATE_KEY");
  if (!delegatedUser) missingConfig.push("GMAIL_WORKSPACE_DELEGATED_USER");

  if (missingConfig.length > 0) {
    return {
      config: null,
      missingConfig,
    };
  }

  return {
    config: {
      serviceAccountEmail,
      privateKey,
      delegatedUser,
      testRecipient,
    } satisfies GmailWorkspaceConfig,
    missingConfig,
  };
}

async function getDelegatedAccessToken(config: GmailWorkspaceConfig, scopes: string[]) {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = toBase64Url(
    JSON.stringify({
      iss: config.serviceAccountEmail,
      sub: config.delegatedUser,
      scope: scopes.join(" "),
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
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });

  const body = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description || body.error || "Failed to obtain Gmail access token.");
  }

  return body.access_token;
}

async function listRecentThreads(config: GmailWorkspaceConfig) {
  const accessToken = await getDelegatedAccessToken(config, [GMAIL_READ_SCOPE]);
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=5", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as {
    threads?: Array<{ id?: string }>;
    resultSizeEstimate?: number;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(body.error?.message || "Failed to list Gmail threads.");
  }

  return {
    count: body.resultSizeEstimate ?? body.threads?.length ?? 0,
    threadIds: (body.threads ?? []).map((thread) => thread.id).filter(Boolean) as string[],
  };
}

function buildRawTestMessage(config: GmailWorkspaceConfig) {
  const subject = "OSH Gmail feasibility test";
  const raw = [
    `From: OSH CRM <${config.delegatedUser}>`,
    `To: ${config.testRecipient}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    "Dette er en automatisk Gmail-feasibility-test fra OSH admin.",
  ].join("\r\n");

  return toBase64Url(raw);
}

async function sendTestMail(config: GmailWorkspaceConfig) {
  const accessToken = await getDelegatedAccessToken(config, [GMAIL_SEND_SCOPE]);
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: buildRawTestMessage(config),
    }),
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
  };

  if (!response.ok || !body.id) {
    throw new Error(body.error?.message || "Failed to send Gmail test message.");
  }

  return body.id;
}

export function getGmailFeasibilitySummary() {
  const { config, missingConfig } = getConfig();
  return {
    configured: Boolean(config),
    missingConfig,
    delegatedUser: config?.delegatedUser ?? null,
    testRecipient: config?.testRecipient ?? null,
  };
}

export async function runGmailFeasibilityCheck(): Promise<GmailFeasibilityResult> {
  const { config, missingConfig } = getConfig();
  const base: GmailFeasibilityResult = {
    configured: Boolean(config),
    missingConfig,
    delegatedUser: config?.delegatedUser ?? null,
    testRecipient: config?.testRecipient ?? null,
    goNoGo: "no-go",
    readThreads: { ok: false },
    sendMail: { ok: false },
    notes: [
      "Domain-wide delegation må settes opp av Google Workspace super admin.",
      "Vellykket lesing og sending som den delegerte brukeren regnes som praktisk bevis på at oppsettet virker.",
    ],
  };

  if (!config) {
    return {
      ...base,
      readThreads: { ok: false, error: "Manglende Gmail-konfigurasjon." },
      sendMail: { ok: false, error: "Manglende Gmail-konfigurasjon." },
    };
  }

  try {
    const threads = await listRecentThreads(config);
    base.readThreads = {
      ok: true,
      count: threads.count,
      threadIds: threads.threadIds,
    };
  } catch (error) {
    base.readThreads = {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown Gmail read error.",
    };
  }

  try {
    const messageId = await sendTestMail(config);
    base.sendMail = {
      ok: true,
      messageId,
    };
  } catch (error) {
    base.sendMail = {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown Gmail send error.",
    };
  }

  return {
    ...base,
    goNoGo: base.readThreads.ok && base.sendMail.ok ? "go" : "no-go",
  };
}
