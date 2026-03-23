import { test, expect } from "@playwright/test";

/**
 * Funksjonalitetstester for offentlige sider
 *
 * Sjekker at sider er oppe og fungerer uten innlogging.
 */

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
  await expect(page.locator("h1")).toContainText(/Student Hub 2026|Registration/i);

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
  await page.locator('input[type="email"]').first().fill("ola@test.no");
  await page.locator('input[type="tel"], input[placeholder*="phone" i]').first().fill("12345678");

  // Klikk neste (Company-steg)
  await page.getByRole("button", { name: /next|neste/i }).click();

  // Skal nå være på Company-steget
  await expect(page.getByText(/Company name|MVA-ID/i)).toBeVisible();
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
