import { cache } from "react";
import { readdir } from "node:fs/promises";
import path from "node:path";

export type PartnerLogoItem = {
  src: string;
  alt: string;
  name: string;
};

const PARTNER_LOGO_DIR = path.join(
  process.cwd(),
  "public",
  "Partner-site",
  "Partner-logos",
);

const WEB_IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
  ".svg",
]);

function sanitizeName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const getPartnerLogoItems = cache(async function getPartnerLogoItems() {
  const entries = await readdir(PARTNER_LOGO_DIR, { withFileTypes: true }).catch(
    () => [],
  );

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => WEB_IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase()))
    .filter((fileName) => !fileName.toLowerCase().startsWith("logoer "))
    .sort((left, right) => left.localeCompare(right, "nb"))
    .map((fileName) => {
      const name = sanitizeName(fileName);
      return {
        src: `/Partner-site/Partner-logos/${encodeURIComponent(fileName)}`,
        alt: `${name} logo`,
        name,
      };
    });
});
