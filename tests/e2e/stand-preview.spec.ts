import { test, expect } from "@playwright/test";

const tierCounts = {
  standard: 10,
  silver: 17,
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

  await expect(page.getByTestId("preview-stand-count")).toContainText("10 stands");
  for (const label of ["Standard 14", "Standard 15", "Standard 16", "Standard 17", "Standard 18", "Standard 19", "Standard 20", "Standard 21", "Standard 22", "Standard 23"]) {
    await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
  }
  for (const label of ["Standard 1", "Standard 2", "Standard 3", "Standard 4", "Standard 5", "Standard 6", "Standard 7", "Standard 8", "Standard 9", "Standard 10", "Standard 11", "Standard 12", "Standard 13", "Silver 18", "Silver 19", "Silver 20"]) {
    await expect(page.getByRole("button", { name: label, exact: true })).toHaveCount(0);
  }
  await expect(page.getByRole("button", { name: "Silver 1", exact: true })).toHaveCount(0);
});
