import { expect, test } from "@playwright/test";

const FLOORPLAN_ALT = "Student Connect 2026 floor plan";

function fullyDecode(value: string) {
  let decoded = value;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    decoded = decodeURIComponent(decoded);
  }

  return decoded;
}

test("Student Connect uses the new floorplan on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/hovedside/studentconnect2026");

  await page.getByRole("button", { name: "Show floor plan" }).click();

  const floorplan = page.getByAltText(FLOORPLAN_ALT);
  await expect(floorplan).toBeVisible();

  const src = await floorplan.getAttribute("src");
  expect(fullyDecode(src ?? "")).toContain(
    "/StudentConnect-site/Floorplan_new.png",
  );
});

test("Student Connect keeps the interactive floorplan on desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/hovedside/studentconnect2026");

  const floorplan = page.getByAltText(FLOORPLAN_ALT);
  await expect(floorplan).toBeVisible();

  const src = await floorplan.getAttribute("src");
  expect(fullyDecode(src ?? "")).toContain(
    "/StudentConnect-site/Floorplan_new.png",
  );
  await expect(
    page.getByRole("button", { name: "Show floor plan" }),
  ).toHaveCount(0);

  const innovationRoom = page.getByRole("button", {
    name: "Koblingspunkt Oslo – Innovation Room",
  });
  await expect(innovationRoom).toBeVisible();
  await expect(innovationRoom.locator("img")).toHaveAttribute(
    "src",
    /PunktOslo-logo\.png/,
  );

  await innovationRoom.hover();
  const innovationRoomTooltip = page.getByRole("tooltip");
  await expect(innovationRoomTooltip).toContainText(
    "Koblingspunkt connects businesses with students",
  );
  await expect(innovationRoomTooltip).toContainText(
    "In the Innovation Room today",
  );

  await innovationRoom.focus();
  await expect(innovationRoomTooltip).toBeVisible();
});
