import { test, expect } from "@playwright/test";

const tierCounts = {
  standard: 20,
  silver: 20,
  gold: 8,
  platinum: 4,
} as const;

test.use({
  viewport: { width: 1440, height: 1600 },
});

for (const [tier, count] of Object.entries(tierCounts)) {
  test(`Stand preview for ${tier} matches the floorplan`, async ({ page }) => {
    await page.goto(`/dev/stand-preview/student-connect-2026?tier=${tier}`);

    await expect(page.getByTestId("preview-stand-count")).toContainText(`${count} stand`);
    await expect(page.getByTestId("stand-preview-map")).toHaveScreenshot(`stand-preview-${tier}.png`, {
      animations: "disabled",
      caret: "hide",
    });
  });
}

test("Stand preview tier switch updates the visible stand set", async ({ page }) => {
  await page.goto("/dev/stand-preview/student-connect-2026?tier=standard");

  await expect(page.getByTestId("preview-stand-count")).toContainText("20 stands");
  await expect(page.getByRole("button", { name: "Standard 1", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Silver 1", exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: /gold/i }).click();
  await page.waitForURL("**/dev/stand-preview/student-connect-2026?tier=gold");

  await expect(page.getByTestId("preview-stand-count")).toContainText("8 stands");
  await expect(page.getByRole("button", { name: "Gold 1", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Standard 1", exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: /platinum/i }).click();
  await page.waitForURL("**/dev/stand-preview/student-connect-2026?tier=platinum");

  await expect(page.getByTestId("preview-stand-count")).toContainText("4 stands");
  await expect(page.getByRole("button", { name: "Platinum 1", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gold 1", exact: true })).toHaveCount(0);
});
