import { createSign } from "node:crypto";

export const GMAIL_READ_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

export type GmailWorkspaceConfig = {
  serviceAccountEmail: string;
  privateKey: string;
  delegatedUser: string;
  testRecipient: string;
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

export function getGmailWorkspaceConfig(input?: {
  defaultDelegatedUser?: string;
  defaultTestRecipient?: string;
}) {
  const serviceAccountEmail =
    process.env.GMAIL_WORKSPACE_SERVICE_ACCOUNT_EMAIL?.trim() ||
    process.env.CRM_GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() ||
    "";
  const privateKey =
    normalizePrivateKey(process.env.GMAIL_WORKSPACE_PRIVATE_KEY) ||
    normalizePrivateKey(process.env.CRM_GOOGLE_PRIVATE_KEY);
  const delegatedUser =
    process.env.GMAIL_WORKSPACE_DELEGATED_USER?.trim() ||
    input?.defaultDelegatedUser?.trim() ||
    "";
  const testRecipient =
    process.env.GMAIL_WORKSPACE_TEST_TO?.trim() ||
    input?.defaultTestRecipient?.trim() ||
    delegatedUser;

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

export async function getDelegatedAccessToken(config: GmailWorkspaceConfig, scopes: string[]) {
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

export async function gmailApiFetch<T>(
  config: GmailWorkspaceConfig,
  path: string,
  input: {
    method?: "GET" | "POST";
    body?: BodyInit | null;
    headers?: HeadersInit;
    scopes: string[];
  },
) {
  const accessToken = await getDelegatedAccessToken(config, input.scopes);
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    method: input.method ?? "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(input.body ? { "Content-Type": "application/json" } : {}),
      ...input.headers,
    },
    body: input.body ?? null,
    cache: "no-store",
  });

  const body = (await response.json().catch(() => ({}))) as T & {
    error?: { message?: string };
    error_description?: string;
  };

  if (!response.ok) {
    const message =
      body.error?.message ||
      body.error_description ||
      `Gmail API request failed for ${path}.`;
    throw new Error(message);
  }

  return body;
}
