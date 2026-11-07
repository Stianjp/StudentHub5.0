import { expect, test } from "@playwright/test";

test("registration landing explains approvals and offers the interest form", async ({ page }) => {
  await page.goto("/event-register");
  await expect(page.getByText("Choose an open registration below to join an Oslo Student Hub event.")).toBeVisible();
  await expect(page.getByText("All registrations are reviewed by OSH before approval.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Get contacted when registration opens" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Company name" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "E-mail" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /I agree to be contacted/ })).not.toBeChecked();
});

test("partners page previews the date and offers the same interest form", async ({ page }) => {
  await page.goto("/hovedside/partners");
  await expect(page.getByRole("heading", { name: "Student Connect 2027" })).toBeVisible();
  await expect(page.getByText("Late October 2027 · More info coming.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Company name" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /I agree to be contacted/ })).not.toBeChecked();
});
