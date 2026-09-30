import { expect, test, type Page } from "@playwright/test";

const DISABLED_RIGHT_ROOM_STAND_LABELS = [
  "Standard 1",
  "Standard 2",
  "Standard 3",
  "Standard 4",
  "Standard 5",
  "Standard 6",
  "Standard 7",
  "Standard 8",
  "Standard 9",
  "Standard 10",
  "Standard 11",
  "Standard 12",
  "Standard 13",
] as const;

const ACTIVE_STANDARD_STAND_LABELS = [
  "Standard 14",
  "Standard 15",
  "Standard 16",
  "Standard 17",
  "Standard 18",
  "Standard 19",
  "Standard 20",
  "Standard 21",
  "Standard 22",
  "Standard 23",
] as const;

async function clickNext(page: Page) {
  await page.getByRole("button", { name: "Next", exact: true }).click({ force: true });
}

async function openStandardStandStep(page: Page) {
  await page.goto("/event-register/student-connect-2026");
  await page.getByLabel("First name").fill("Ola");
  await page.getByLabel("Last name").fill("Nordmann");
  await page.getByLabel("E-mail").fill("ola@example.com");
  await page.getByLabel("Phone number").fill("12345678");
  await clickNext(page);

  await page.getByLabel("Company name").fill("Acme AS");
  await page.getByLabel("MVA-ID").fill("123456789");
  await page.getByLabel("Country / Region").fill("Norway");
  await page.getByLabel("Address").fill("Karl Johans gate 1");
  await page.getByLabel("City").fill("Oslo");
  await page.getByLabel("Zip / Postal code").fill("0154");
  await clickNext(page);
  await expect(page.getByLabel("Invoice reference")).toBeVisible();
  await page.getByLabel("Invoice e-mail").fill("invoice@example.com");
  await page.getByLabel("Invoice reference").fill("PO-123");
  await clickNext(page);

  await expect(page.getByText("IT / Computer engineer", { exact: true })).toBeVisible();
  await page.getByLabel("IT / Computer engineer").check();
  await clickNext(page);
  await expect(page.getByRole("button", { name: /^Standard\b/i })).toBeVisible();

  await page.getByRole("button", { name: /^Standard\b/i }).click();
  await clickNext(page);

  const map = page.getByTestId("stand-map-canvas");
  await expect(map).toBeVisible();
  await map.scrollIntoViewIfNeeded();
  return map;
}

function standNamePattern(label: string) {
  return new RegExp(`(^|\\b)${label.replace(/[.*+?^${}()|[\\]\\]/g, "\\\\$&")}(\\b|$)`);
}

test("Right-room standard stands are not selectable in registration", async ({ page }) => {
  const map = await openStandardStandStep(page);

  for (const label of ACTIVE_STANDARD_STAND_LABELS) {
    await expect(map.getByRole("button", { name: standNamePattern(label) })).toBeVisible();
  }

  for (const label of DISABLED_RIGHT_ROOM_STAND_LABELS) {
    await expect(map.getByRole("button", { name: label, exact: true })).toHaveCount(0);
  }
});
