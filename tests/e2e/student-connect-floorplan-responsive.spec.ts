import { expect, test } from "@playwright/test";

const FLOORPLAN_ALT = "Student Connect 2026 floor plan";

function fullyDecode(value: string) {
  let decoded = value;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    decoded = decodeURIComponent(decoded);
  }

  return decoded;
}

test("Student Connect uses the PNG floorplan on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/hovedside/studentconnect2026");

  await page.getByRole("button", { name: "Show floor plan" }).click();

  const floorplan = page.getByAltText(FLOORPLAN_ALT);
  await expect(floorplan).toBeVisible();

  const src = await floorplan.getAttribute("src");
  expect(fullyDecode(src ?? "")).toContain(
    "/StudentConnect-site/Floorplan OSH.png",
  );
});

test("Student Connect keeps the interactive SVG floorplan on desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/hovedside/studentconnect2026");

  const floorplan = page.getByAltText(FLOORPLAN_ALT);
  await expect(floorplan).toBeVisible();

  const src = await floorplan.getAttribute("src");
  expect(fullyDecode(src ?? "")).toContain(
    "/event-register/student-connect-2026-floorplan.svg",
  );
  await expect(
    page.getByRole("button", { name: "Show floor plan" }),
  ).toHaveCount(0);
});
