import { test, expect } from "@playwright/test";

/**
 * Sikkerhetstester
 *
 * Verifiserer at beskyttede sider krever innlogging og at
 * API-endepunkter returnerer 401/403 for uautoriserte forespørsler.
 */

// --- Sidebeskyttelse: videresending til innlogging ---

const PROTECTED_PAGES = [
  { path: "/admin", label: "Admin-oversikt" },
  { path: "/admin/companies", label: "Admin bedrifter" },
  { path: "/admin/students", label: "Admin studenter" },
  { path: "/admin/leads", label: "Admin leads" },
  { path: "/admin/crm", label: "Admin CRM" },
  { path: "/admin/email", label: "Admin e-post" },
  { path: "/company", label: "Bedriftsportal" },
  { path: "/student/dashboard", label: "Studentdashbord" },
  { path: "/checkin", label: "Innsjekk" },
];

for (const page of PROTECTED_PAGES) {
  test(`${page.label} (${page.path}) videresendes til innlogging uten sesjon`, async ({
    page: browserPage,
    context,
  }) => {
    // Sørg for at vi ikke har noen cookies/sesjon
    await context.clearCookies();

    await browserPage.goto(page.path, { waitUntil: "domcontentloaded" });

    // Skal havne på en auth-side
    const url = browserPage.url();
    expect(url).toMatch(/\/auth\/sign-in/);
  });
}

// --- API-endepunkter: 401/403 uten auth ---

const PROTECTED_APIS = [
  { method: "GET", path: "/api/admin/crm/leads", label: "CRM leads API" },
  { method: "POST", path: "/api/admin/tickets/export", label: "Billett-eksport API" },
  { method: "POST", path: "/api/checkin/checkin", label: "Innsjekk API" },
  { method: "GET", path: "/api/checkin/search?q=test", label: "Søk innsjekk API" },
];

for (const api of PROTECTED_APIS) {
  test(`${api.label} (${api.method} ${api.path}) returnerer 401/403 uten sesjon`, async ({
    request,
  }) => {
    const response = await request[api.method.toLowerCase() as "get" | "post"](api.path, {
      headers: { "Content-Type": "application/json" },
    });

    expect([401, 403]).toContain(response.status());
  });
}

// --- Admin kan ikke registrere seg selv ---

test("Magic-link API avviser admin-rolle", async ({ request }) => {
  const response = await request.post("/api/auth/magic-link", {
    data: { email: "test@test.no", role: "admin" },
  });

  // Skal returnere 400 eller 403 - admin kan ikke bruke magic link
  expect([400, 403]).toContain(response.status());
});

// --- Ingen informasjonslekkasje i feilresponser ---

test("Beskyttet API returnerer ikke sensitiv info i feilmelding", async ({ request }) => {
  const response = await request.get("/api/admin/crm/leads");
  const body = await response.text();

  // Skal ikke lekke intern info
  expect(body).not.toMatch(/SUPABASE_SERVICE_ROLE/);
  expect(body).not.toMatch(/postgres:\/\//);
  expect(body).not.toMatch(/stack trace/i);
});
