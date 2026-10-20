// Isolated, local-only Supabase stand-in for student portal browser tests.
// No production data or credentials are used, and no test auth paths exist in the app.
import { createServer } from "node:http";
import { spawn } from "node:child_process";

const apiPort = 4051;
const appPort = 3013;
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const user = {
  id: id(1),
  email: "student@example.test",
  aud: "authenticated",
  role: "authenticated",
  created_at: "2026-01-01T00:00:00Z",
  app_metadata: { provider: "email" },
  user_metadata: { full_name: "Ada Student" },
};
const adminUser = { ...user, id: id(3), email: "admin@oslostudenthub.no" };
const companyUser = { ...user, id: id(4), email: "company@example.test" };
const users = [user, adminUser, companyUser];
let tables;
function reset() {
  const companies = [
    "Alpha",
    "Beta",
    "Gamma",
    "Delta",
    "Epsilon",
    "Other event",
  ].map((name, i) => ({
    id: id(10 + i),
    name,
    industry: i === 1 ? "Elektro" : "Data/IT",
    recruitment_fields: [i === 1 ? "Elektro" : "Data/IT"],
    org_number: String(999000000 + i),
    logo_path: i === 0 ? "test.svg" : null,
    representation_text: null,
    location: "Oslo",
    recruitment_job_types: [],
    recruitment_levels: [],
    recruitment_years_bachelor: [],
    recruitment_years_master: [],
    branding_values: [],
  }));
  const event = {
    id: id(20),
    name: "Test event",
    slug: "test-event",
    is_active: true,
    website_published: true,
    starts_at: "2027-01-01T10:00Z",
    ends_at: "2027-01-01T16:00Z",
    registration_form_url: null,
  };
  const campaign = {
    id: id(30),
    event_id: event.id,
    slug: "test-event",
    public_title: "Test event",
    public_description: "Choose your audience, package and extras.",
    is_published: true,
    opens_at: null,
    closes_at: null,
    event,
  };
  tables = {
    profiles: [
      { id: user.id, role: "student" },
      { id: adminUser.id, role: "admin" },
    ],
    students: [{ id: id(2), user_id: user.id, full_name: "Ada Student" }],
    events: [event],
    companies,
    company_users: [],
    event_companies: [
      {
        id: id(50),
        event_id: event.id,
        company_id: companies[0].id,
        target_fields: ["IT / Computer engineer"],
        confirmed_area: "IT",
        stand_code: "A1",
        company: { name: companies[0].name },
      },
    ],
    event_registration_campaigns: [campaign],
    event_registration_packages: [
      {
        id: id(31),
        campaign_id: campaign.id,
        mapped_package: "standard",
        package_key: "standard",
        public_name: "Standard",
        price_ore: 2000000,
        included_quantities: { [id(61)]: 2, [id(62)]: 2 },
        is_active: true,
        sort_order: 0,
      },
    ],
    event_addons: [
      {
        id: id(61),
        event_id: event.id,
        name: "Tables",
        unit: "table",
        unit_price_ore: 10000,
        is_active: true,
        kind: "item",
        sort_order: 0,
      },
      {
        id: id(62),
        event_id: event.id,
        name: "Employee tickets",
        unit: "ticket",
        unit_price_ore: null,
        is_active: false,
        kind: "attendee_ticket",
        sort_order: 1,
      },
    ],
    event_registration_applications: [
      {
        id: id(40),
        event_id: event.id,
        campaign_id: campaign.id,
        event_company_id: id(50),
        company_id: companies[0].id,
        company_name: companies[0].name,
        status: "approved",
        candidate_fields: ["IT / Computer engineer"],
        candidate_fields_other: null,
      },
    ],
    event_registration_stands: [],
    event_registration_portal_emails: [],
    company_portal_invites: [],
    company_user_requests: [],
    event_tickets: [],
    stand_visits: [],
    consents: [],
    leads: [],
    crm_pipeline_entries: [],
  };
}
reset();
const session = (sessionUser = user) => {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return {
    access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: sessionUser.id, aud: "authenticated", role: "authenticated", email: sessionUser.email, exp: now + 3600, iat: now })}.local-test-signature`,
    refresh_token: "local-test-refresh",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    user: sessionUser,
  };
};
function matches(row, key, filter) {
  if (filter.startsWith("eq.")) return String(row[key]) === filter.slice(3);
  if (filter.startsWith("in.("))
    return filter
      .slice(4, -1)
      .replaceAll('"', "")
      .split(",")
      .includes(String(row[key]));
  if (filter === "not.is.null") return row[key] != null;
  if (filter === "is.null") return row[key] == null;
  throw new Error(`Unsupported test filter: ${key}=${filter}`);
}
const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,DELETE,OPTIONS",
  );
  const send = (body, code = 200) => {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (req.method === "OPTIONS") return send({});
  try {
    const url = new URL(req.url, `http://127.0.0.1:${apiPort}`);
    let body = "";
    for await (const chunk of req) body += chunk;
    const input = body ? JSON.parse(body) : null;
    if (url.pathname === "/test/reset") {
      reset();
      return send({ ok: true });
    }
    if (url.pathname === "/test/close") {
      tables.events[0].is_active = false;
      return send({ ok: true });
    }
    if (url.pathname === "/test/state") return send(tables);
    if (url.pathname === "/auth/v1/token")
      return send(
        session(
          users.find((candidate) => candidate.email === input?.email) ?? user,
        ),
      );
    if (url.pathname === "/auth/v1/user") {
      if (!req.headers.authorization?.includes("local-test-signature"))
        return send({ message: "No test session" }, 401);
      const claims = JSON.parse(
        Buffer.from(
          req.headers.authorization.split(".")[1],
          "base64url",
        ).toString(),
      );
      return send(users.find((candidate) => candidate.id === claims.sub));
    }
    if (url.pathname === "/auth/v1/logout") return send({});
    if (url.pathname === "/auth/v1/authorize") {
      const target = new URL(url.searchParams.get("redirect_to"));
      target.searchParams.set("code", "local-test-code");
      res.writeHead(302, { Location: target.toString() });
      return res.end();
    }
    if (url.pathname.startsWith("/storage/v1/object/list/")) return send([]);
    if (
      url.pathname.startsWith("/storage/v1/object/sign/") &&
      req.method === "POST"
    )
      return send({
        signedURL: "/object/sign/event-registration-assets/test.svg?token=test",
      });
    if (url.pathname.startsWith("/storage/v1/")) {
      res.writeHead(200, { "Content-Type": "image/svg+xml" });
      return res.end(
        '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="48"><rect width="96" height="48" fill="white"/><text x="48" y="32" text-anchor="middle" fill="#140249" font-size="23">Alpha</text></svg>',
      );
    }
    if (!url.pathname.startsWith("/rest/v1/"))
      return send({ error: "Unknown fixture endpoint" }, 404);
    const table = url.pathname.split("/").pop();
    if (table === "is_admin") return send(true);
    if (!tables[table]) throw new Error(`Unsupported test table: ${table}`);
    const filters = [...url.searchParams].filter(
      ([key]) =>
        !["select", "order", "limit", "offset", "on_conflict"].includes(key),
    );
    let rows = tables[table].filter((row) =>
      filters.every(([key, value]) => matches(row, key, value)),
    );
    if (req.method === "PATCH")
      rows.forEach((row) => Object.assign(row, input));
    if (req.method === "POST") {
      rows = (Array.isArray(input) ? input : [input]).map((row, i) => ({
        id: id(100 + tables[table].length + i),
        ...row,
      }));
      tables[table].push(...rows);
    }
    if (url.searchParams.has("offset"))
      rows = rows.slice(Number(url.searchParams.get("offset")));
    if (url.searchParams.has("limit"))
      rows = rows.slice(0, Number(url.searchParams.get("limit")));
    if (table === "event_registration_campaigns")
      rows = rows.map((row) => ({
        ...row,
        event: tables.events.find((e) => e.id === row.event_id),
      }));
    if (table === "consents")
      rows = rows.map((row) => ({
        ...row,
        company: tables.companies.find((c) => c.id === row.company_id) ?? null,
        event: null,
      }));
    send(
      req.headers.accept?.includes("vnd.pgrst.object")
        ? (rows[0] ?? null)
        : rows,
    );
  } catch (error) {
    console.error(error.message);
    send({ message: error.message }, 500);
  }
});
server.listen(apiPort, "127.0.0.1", () =>
  console.log(`Student fixture API on ${apiPort}`),
);
const next = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--webpack",
    "--port",
    String(appPort),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      EVENT_MANAGEMENT_TEST: "1",
      NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${apiPort}`,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-test-anon",
      SUPABASE_SERVICE_ROLE_KEY: "local-test-service",
      RESEND_API_KEY: "",
      NEXT_PUBLIC_COOKIE_DOMAIN: "",
    },
  },
);
const stop = () => {
  next.kill("SIGTERM");
  server.close();
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
next.on("exit", (code) => {
  server.close();
  process.exit(code ?? 0);
});
