// Isolated, local-only Supabase stand-in for student portal browser tests.
// No production data or credentials are used, and no test auth paths exist in the app.
import { createServer } from "node:http";
import { spawn } from "node:child_process";

const apiPort = 4050;
const appPort = 3012;
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const user = { id: id(1), email: "student@example.test", aud: "authenticated", role: "authenticated", created_at: "2026-01-01T00:00:00Z", app_metadata: { provider: "email" }, user_metadata: { full_name: "Ada Student" } };
let tables;
function reset() {
  const companies = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Other event"].map((name, i) => ({ id: id(10 + i), name, industry: i === 1 ? "Elektro" : "Data/IT", recruitment_fields: [i === 1 ? "Elektro" : "Data/IT"], org_number: String(999000000 + i), logo_path: i === 0 ? "test.svg" : null, representation_text: null }));
  tables = {
    profiles: [{ id: user.id, role: "student", full_name: "Ada Student" }],
    students: [{ id: id(2), user_id: user.id, email: user.email, full_name: "Ada Student", school: "UiO", study_program: "Data/IT", study_level: "Bachelor", study_year: 2, phone: null, about: null, work_style: null, social_profile: null, team_size: null, liked_company_ids: [id(11), id(15)], interests: [], job_types: [], values: [], preferred_locations: [], willing_to_relocate: false, created_at: "2026-01-01T00:00:00Z" }],
    companies,
    event_registration_campaigns: [{ id: id(30), slug: "student-connect-2026" }],
    event_registration_packages: [{ id: id(31), mapped_package: "gold", public_name: "Gold" }, { id: id(32), mapped_package: "standard", public_name: "Standard" }],
    event_registration_stands: [],
    event_registration_applications: [...companies.slice(0, 5).map((c, i) => ({ id: id(40 + i), campaign_id: id(30), company_id: c.id, company_name: c.name, org_number: c.org_number, logo_path: c.logo_path, candidate_level: "bachelor", candidate_fields: c.recruitment_fields, candidate_fields_other: null, approved_package_id: i === 0 ? id(31) : id(32), requested_package_id: null, approved_stand_id: null, requested_stand_id: null, status: "approved", approved_at: "2026-01-01" })), { id: id(49), campaign_id: id(30), company_id: id(10), company_name: "Alpha duplicate", org_number: "999000000", candidate_fields: [], approved_package_id: id(32), status: "approved", logo_path: null }],
    consents: [], leads: [],
  };
}
reset();
const session = () => {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return { access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, aud: "authenticated", role: "authenticated", email: user.email, exp: now + 3600, iat: now })}.local-test-signature`, refresh_token: "local-test-refresh", token_type: "bearer", expires_in: 3600, expires_at: now + 3600, user };
};
function matches(row, key, filter) {
  if (filter.startsWith("eq.")) return String(row[key]) === filter.slice(3);
  if (filter.startsWith("in.(")) return filter.slice(4, -1).replaceAll('"', "").split(",").includes(String(row[key]));
  if (filter === "not.is.null") return row[key] != null;
  if (filter === "is.null") return row[key] == null;
  throw new Error(`Unsupported test filter: ${key}=${filter}`);
}
const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  const send = (body, code = 200) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
  if (req.method === "OPTIONS") return send({});
  try {
    const url = new URL(req.url, `http://127.0.0.1:${apiPort}`);
    let body = "";
    for await (const chunk of req) body += chunk;
    const input = body ? JSON.parse(body) : null;
    if (url.pathname === "/test/reset") { reset(); return send({ ok: true }); }
    if (url.pathname === "/test/state") return send(tables);
    if (url.pathname === "/auth/v1/token") return send(session());
    if (url.pathname === "/auth/v1/user") return req.headers.authorization?.includes("local-test-signature") ? send(user) : send({ message: "No test session" }, 401);
    if (url.pathname === "/auth/v1/logout") return send({});
    if (url.pathname === "/auth/v1/authorize") {
      const target = new URL(url.searchParams.get("redirect_to"));
      target.searchParams.set("code", "local-test-code");
      res.writeHead(302, { Location: target.toString() }); return res.end();
    }
    if (url.pathname.startsWith("/storage/v1/object/list/")) return send([]);
    if (url.pathname.startsWith("/storage/v1/object/sign/") && req.method === "POST") return send({ signedURL: "/object/sign/event-registration-assets/test.svg?token=test" });
    if (url.pathname.startsWith("/storage/v1/")) {
      res.writeHead(200, { "Content-Type": "image/svg+xml" });
      return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="48"><rect width="96" height="48" fill="white"/><text x="48" y="32" text-anchor="middle" fill="#140249" font-size="23">Alpha</text></svg>');
    }
    if (!url.pathname.startsWith("/rest/v1/")) return send({ error: "Unknown fixture endpoint" }, 404);
    const table = url.pathname.split("/").pop();
    if (!tables[table]) throw new Error(`Unsupported test table: ${table}`);
    const filters = [...url.searchParams].filter(([key]) => !["select", "order", "limit", "offset", "on_conflict"].includes(key));
    let rows = tables[table].filter((row) => filters.every(([key, value]) => matches(row, key, value)));
    if (req.method === "PATCH") rows.forEach((row) => Object.assign(row, input));
    if (req.method === "POST") {
      rows = (Array.isArray(input) ? input : [input]).map((row, i) => ({ id: id(100 + tables[table].length + i), ...row }));
      tables[table].push(...rows);
    }
    if (url.searchParams.has("limit")) rows = rows.slice(0, Number(url.searchParams.get("limit")));
    if (table === "consents") rows = rows.map((row) => ({ ...row, company: tables.companies.find((c) => c.id === row.company_id) ?? null, event: null }));
    send(req.headers.accept?.includes("vnd.pgrst.object") ? rows[0] ?? null : rows);
  } catch (error) {
    console.error(error.message);
    send({ message: error.message }, 500);
  }
});
server.listen(apiPort, "127.0.0.1", () => console.log(`Student fixture API on ${apiPort}`));
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack", "--port", String(appPort)], {
  stdio: "inherit",
  env: { ...process.env, STUDENT_PORTAL_TEST: "1", NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${apiPort}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-test-anon", SUPABASE_SERVICE_ROLE_KEY: "local-test-service", NEXT_PUBLIC_COOKIE_DOMAIN: "" },
});
const stop = () => { next.kill("SIGTERM"); server.close(); };
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
next.on("exit", (code) => { server.close(); process.exit(code ?? 0); });
