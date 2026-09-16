import { expect, test } from "@playwright/test";

test("mobile company pagination reaches page four with resized logos", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/hovedside/studentconnect2026#companies");

  const companies = page.locator("#companies");
  const next = companies.getByRole("button", { name: "Next", exact: true });

  for (let pageNumber = 2; pageNumber <= 4; pageNumber += 1) {
    await next.click();
    await expect(
      companies.getByText(new RegExp(`^${pageNumber} / \\d+$`)),
    ).toBeVisible();
  }

  await expect(
    companies.getByText("NCC Norge AS", { exact: true }),
  ).toBeVisible();
  await expect(
    companies.getByText(/Application error|client-side exception/i),
  ).toHaveCount(0);

  const pageFourLogos = companies.locator("button img");
  await expect(pageFourLogos).toHaveCount(5);
  await expect
    .poll(() =>
      pageFourLogos.evaluateAll((images) =>
        images.every((image) => {
          const logo = image as HTMLImageElement;
          return (
            logo.complete &&
            logo.naturalWidth > 0 &&
            logo.naturalWidth <= 640 &&
            logo.naturalHeight <= 360
          );
        }),
      ),
    )
    .toBe(true);
});

test("company cards do not repeat package or stand labels", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/hovedside/studentconnect2026#companies");

  const card = page.getByRole("button", {
    name: "Read more about Bryn Byggklima AS",
  });
  await expect(card).toBeVisible();
  await expect(card.getByText("Platinum", { exact: true })).toHaveCount(0);
  await expect(card.getByText(/^Platinum \d+$/)).toHaveCount(0);
});
