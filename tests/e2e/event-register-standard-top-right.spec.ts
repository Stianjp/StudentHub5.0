import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { STUDENT_CONNECT_2026_STANDARD_TOP_RIGHT_OVERRIDES } from "../../lib/event-registration-stand-overrides";

const STANDARD_LABELS = ["Standard 4", "Standard 5", "Standard 6"] as const;
const PASS_SELECTIONS = ["Standard 4", "Standard 5", "Standard 6", "Standard 4"] as const;
const POSITION_TOLERANCE_PX = 4;
const SIZE_TOLERANCE_PX = 3;
const PERSISTED_OUTPUT_DIR = path.join(process.cwd(), "test-results", "event-register-standard-top-right");

type StandardLabel = (typeof STANDARD_LABELS)[number];
type Box = { x: number; y: number; width: number; height: number };

async function clickNext(page: Page) {
  await page.getByRole("button", { name: "Next", exact: true }).click();
}

async function openStandardStandStep(page: Page) {
  await page.goto("/event-register/student-connect-2026");
  await page.getByLabel("First name").fill("Ola");
  await page.getByLabel("Last name").fill("Nordmann");
  await page.getByLabel("E-mail").fill("ola@example.com");
  await page.getByLabel("Phone number").fill("12345678");
  await clickNext(page);
  await expect(page.getByLabel("Company name")).toBeVisible();

  await page.getByLabel("Company name").fill("Acme AS");
  await page.getByLabel("MVA-ID").fill("123456789");
  await page.getByLabel("Country / Region").fill("Norway");
  await page.getByLabel("Address").fill("Karl Johans gate 1");
  await page.getByLabel("City").fill("Oslo");
  await page.getByLabel("Zip / Postal code").fill("0154");
  await clickNext(page);
  await expect(page.getByLabel("Invoice reference")).toBeVisible();
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

function overlaps(a: Box, b: Box) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function unionClip(mapBox: Box, boxes: Box[]) {
  const padX = 18;
  const padTop = 28;
  const padBottom = 18;
  const minX = Math.max(mapBox.x, Math.min(...boxes.map((box) => box.x)) - padX);
  const minY = Math.max(mapBox.y, Math.min(...boxes.map((box) => box.y)) - padTop);
  const maxX = Math.min(mapBox.x + mapBox.width, Math.max(...boxes.map((box) => box.x + box.width)) + padX);
  const maxY = Math.min(mapBox.y + mapBox.height, Math.max(...boxes.map((box) => box.y + box.height)) + padBottom);

  return {
    x: Math.floor(minX),
    y: Math.floor(minY),
    width: Math.ceil(maxX - minX),
    height: Math.ceil(maxY - minY),
  };
}

async function getBox(locator: Locator, label: string) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Missing bounding box for ${label}.`);
  }
  return box;
}

async function getClusterState(page: Page, map: Locator) {
  const mapBox = await getBox(map, "stand map");
  const entries = await Promise.all(
    STANDARD_LABELS.map(async (label) => {
      const locator = map.getByRole("button", { name: label, exact: true });
      const box = await getBox(locator, label);
      return [label, { locator, box }] as const;
    }),
  );

  return {
    mapBox,
    buttons: Object.fromEntries(entries) as Record<StandardLabel, { locator: Locator; box: Box }>,
  };
}

function expectedPixelBox(mapBox: Box, label: StandardLabel): Box {
  const geometry = STUDENT_CONNECT_2026_STANDARD_TOP_RIGHT_OVERRIDES[label];
  return {
    x: mapBox.x + (mapBox.width * geometry.x) / 100,
    y: mapBox.y + (mapBox.height * geometry.y) / 100,
    width: (mapBox.width * geometry.width) / 100,
    height: (mapBox.height * geometry.height) / 100,
  };
}

test("Top-right standard cluster stays correct across 4 real event-register passes", async ({ page }, testInfo) => {
  test.setTimeout(120_000);

  await fs.mkdir(PERSISTED_OUTPUT_DIR, { recursive: true });

  for (const [index, selectedLabel] of PASS_SELECTIONS.entries()) {
    await test.step(`pass ${index + 1}: verify cluster and click ${selectedLabel}`, async () => {
      const map = await openStandardStandStep(page);
      const before = await getClusterState(page, map);
      const beforeBoxes = STANDARD_LABELS.map((label) => before.buttons[label].box);
      const clip = unionClip(before.mapBox, beforeBoxes);
      const clusterImage = await page.screenshot({ clip });
      const outputPath = path.join(PERSISTED_OUTPUT_DIR, `standard-top-right-pass-${index + 1}.png`);
      await fs.writeFile(outputPath, clusterImage);
      await testInfo.attach(`standard-top-right-pass-${index + 1}`, {
        path: outputPath,
        contentType: "image/png",
      });

      await expect(clusterImage).toMatchSnapshot("event-register-standard-top-right.png", {
        threshold: 0.2,
        maxDiffPixelRatio: 0.002,
      });

      const box4 = before.buttons["Standard 4"].box;
      const box5 = before.buttons["Standard 5"].box;
      const box6 = before.buttons["Standard 6"].box;

      expect(overlaps(box4, box5)).toBe(false);
      expect(overlaps(box4, box6)).toBe(false);
      expect(overlaps(box5, box6)).toBe(false);
      expect(box4.x + box4.width).toBeLessThan(box5.x);
      expect(box4.x + box4.width).toBeLessThan(box6.x);
      expect(box5.y + box5.height).toBeLessThan(box6.y);

      for (const label of STANDARD_LABELS) {
        const expected = expectedPixelBox(before.mapBox, label);
        const actual = before.buttons[label].box;
        expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(POSITION_TOLERANCE_PX);
        expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(POSITION_TOLERANCE_PX);
        expect(Math.abs(actual.width - expected.width)).toBeLessThanOrEqual(SIZE_TOLERANCE_PX);
        expect(Math.abs(actual.height - expected.height)).toBeLessThanOrEqual(SIZE_TOLERANCE_PX);
      }

      await before.buttons[selectedLabel].locator.click();

      for (const label of STANDARD_LABELS) {
        await expect(before.buttons[label].locator).toHaveAttribute("aria-pressed", label === selectedLabel ? "true" : "false");
      }

      const after = await getClusterState(page, map);
      for (const label of STANDARD_LABELS) {
        const prior = before.buttons[label].box;
        const next = after.buttons[label].box;
        expect(Math.abs(prior.x - next.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(prior.y - next.y)).toBeLessThanOrEqual(1);
        expect(Math.abs(prior.width - next.width)).toBeLessThanOrEqual(1);
        expect(Math.abs(prior.height - next.height)).toBeLessThanOrEqual(1);
      }

      const selectedOutputPath = path.join(PERSISTED_OUTPUT_DIR, `standard-top-right-pass-${index + 1}-selected.png`);
      await map.screenshot({ path: selectedOutputPath });
      await testInfo.attach(`standard-top-right-pass-${index + 1}-selected`, {
        path: selectedOutputPath,
        contentType: "image/png",
      });
    });
  }
});
