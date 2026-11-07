import { expect, test } from "@playwright/test";

test.skip(!process.env.NEXT_PUBLIC_GA_TEST_MEASUREMENT_ID, "Set a test GA4 measurement ID to exercise analytics consent.");

test("loads Google Analytics only after consent and omits URL parameters", async ({ page }) => {
  let tagRequests = 0;
  await page.route("https://www.googletagmanager.com/gtag/js?*", async (route) => {
    tagRequests += 1;
    await route.fulfill({ status: 200, contentType: "application/javascript", body: "" });
  });

  await page.goto("/hovedside/about?private=do-not-send");
  await expect(page.getByRole("button", { name: "Allow analytics" })).toBeVisible();
  expect(tagRequests).toBe(0);

  await page.getByRole("button", { name: "Decline" }).click();
  await expect(page.getByRole("button", { name: /Analytics: off/ })).toBeVisible();
  expect(tagRequests).toBe(0);

  await page.getByRole("button", { name: /Analytics: off/ }).click();
  await expect(page.getByRole("button", { name: /Analytics: on/ })).toBeVisible();
  await expect.poll(() => tagRequests).toBe(1);
  const events = await page.evaluate(() => (window as unknown as { dataLayer?: unknown[][] }).dataLayer ?? []);
  const pageView = events.find((entry) => entry[0] === "event" && entry[1] === "page_view");
  expect(pageView).toBeTruthy();
  expect(JSON.stringify(pageView)).not.toContain("private=do-not-send");

  await page.getByRole("button", { name: /Analytics: on/ }).click();
  await expect(page.getByRole("button", { name: /Analytics: off/ })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Record<string, boolean>)["ga-disable-G-TEST123"])).toBe(true);
});
