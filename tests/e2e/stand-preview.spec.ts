import { test, expect } from "@playwright/test";

const tierCounts = {
  standard: 16,
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

test("Standard preview shows the expected stand set", async ({ page }) => {
  await page.goto("/dev/stand-preview/student-connect-2026?tier=standard");

  await expect(page.getByTestId("preview-stand-count")).toContainText("16 stands");
  await expect(page.getByRole("button", { name: "Standard 4", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Standard 5", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Standard 6", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Standard 13", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Standard 8", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Standard 20", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Standard 1", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Standard 7", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Silver 1", exact: true })).toHaveCount(0);
});
