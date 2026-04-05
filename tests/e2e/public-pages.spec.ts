import { test, expect } from "@playwright/test";

/**
 * Funksjonalitetstester for offentlige sider
 *
 * Sjekker at sider er oppe og fungerer uten innlogging.
 */

async function clickNext(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Next", exact: true }).click();
}

test("Event register-forsiden laster og viser kampanjer", async ({ page }) => {
  await page.goto("/event-register");

  // Skal inneholde OSH-overskrift
  await expect(page.locator("h1")).toContainText(/OSH|Event|Register/i);

  // Ingen 500-feil
  const status = await page.evaluate(() => document.title);
  expect(status).not.toMatch(/500|Error/i);
});

test("Student Connect 2026 registreringsside laster", async ({ page }) => {
  await page.goto("/event-register/student-connect-2026");

  // Skal vise registration-tittelen
  await expect(page.locator("h1")).toContainText(/Student Connect 2026|Registration/i);

  // Skjemaet skal ha Contact-steget synlig
  await expect(page.getByText(/First let us know who you are/i)).toBeVisible();

  // Obligatoriske felt skal finnes
  await expect(page.getByText("First name")).toBeVisible();
  await expect(page.getByText("Last name")).toBeVisible();
  await expect(page.getByText("E-mail")).toBeVisible();
  await expect(page.getByText("Phone number")).toBeVisible();
});

test("Registreringsskjema navigerer mellom steg", async ({ page }) => {
  await page.goto("/event-register/student-connect-2026");

  // Fyll ut Contact-steg
  await page.getByLabel("First name").fill("Ola");
  await page.getByLabel("Last name").fill("Nordmann");
  await page.getByLabel("E-mail").fill("ola@test.no");
  await page.getByLabel("Phone number").fill("12345678");

  // Klikk neste (Company-steg)
  await clickNext(page);

  // Skal nå være på Company-steget
  await expect(page.getByLabel("Company name")).toBeVisible();
});

test("Invoice-steget har Email som default og skjuler invoice e-mail for EHF", async ({ page }) => {
  await page.goto("/event-register/student-connect-2026");

  await page.getByLabel("First name").fill("Ola");
  await page.getByLabel("Last name").fill("Nordmann");
  await page.getByLabel("E-mail").fill("ola@test.no");
  await page.getByLabel("Phone number").fill("12345678");
  await clickNext(page);

  await page.getByLabel("Company name").fill("Acme AS");
  await page.getByLabel("MVA-ID").fill("123456789");
  await page.getByLabel("Country / Region").fill("Norway");
  await page.getByLabel("Address").fill("Karl Johans gate 1");
  await page.getByLabel("City").fill("Oslo");
  await page.getByLabel("Zip / Postal code").fill("0154");
  await clickNext(page);

  await expect(page.getByRole("button", { name: /Email/i }).first()).toHaveClass(/border-\[#FE9A70\]/);
  await expect(page.getByLabel("Invoice e-mail")).toBeVisible();

  await page.getByRole("button", { name: /EHF/i }).first().click();
  await expect(page.getByLabel("Invoice e-mail")).toHaveCount(0);

  await page.getByRole("button", { name: /Email/i }).first().click();
  await expect(page.getByLabel("Invoice e-mail")).toBeVisible();
});

test("Pakkevalg filtrerer stander og nullstiller tidligere standvalg", async ({ page }) => {
  await page.goto("/event-register/student-connect-2026");

  await page.getByLabel("First name").fill("Ola");
  await page.getByLabel("Last name").fill("Nordmann");
  await page.getByLabel("E-mail").fill("ola@test.no");
  await page.getByLabel("Phone number").fill("12345678");
  await clickNext(page);

  await page.getByLabel("Company name").fill("Acme AS");
  await page.getByLabel("MVA-ID").fill("123456789");
  await page.getByLabel("Country / Region").fill("Norway");
  await page.getByLabel("Address").fill("Karl Johans gate 1");
  await page.getByLabel("City").fill("Oslo");
  await page.getByLabel("Zip / Postal code").fill("0154");
  await clickNext(page);

  await page.getByLabel("Invoice e-mail").fill("invoice@acme.no");
  await clickNext(page);

  await page.getByLabel("IT / Computer engineer").check();
  await clickNext(page);

  await page.getByRole("button", { name: /^Silver\b/i }).click();
  await clickNext(page);

  await expect(page.getByRole("button", { name: "Silver 1", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Gold 1", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Silver 1", exact: true }).first().click();

  await page.getByRole("button", { name: /back/i }).click();
  await page.getByRole("button", { name: /^Gold\b/i }).click();
  await clickNext(page);

  await expect(page.getByRole("button", { name: "Gold 1", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Silver 1", exact: true })).toHaveCount(0);

  await clickNext(page);
  await expect(page.getByText("Choose a stand on the floor plan before continuing.")).toBeVisible();
});

test("Innloggingssiden laster", async ({ page }) => {
  await page.goto("/auth/sign-in");

  await expect(page).toHaveTitle(/.+/);

  // Skal ha et e-postfelt
  await expect(page.locator('input[type="email"]')).toBeVisible();
});

test("Ikke-eksisterende kampanje returnerer 404", async ({ page }) => {
  const response = await page.goto("/event-register/finnes-ikke-123");
  expect(response?.status()).toBe(404);
});

test("Offentlig event register-API returnerer kampanjer", async ({ request }) => {
  // Landing API – brukes av registreringssiden
  const response = await request.get("/event-register");
  expect(response.status()).toBe(200);
});
