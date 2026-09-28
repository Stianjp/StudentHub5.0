import { STUDY_CATEGORIES } from "@/components/event/study-categories";

const LEGACY_CATEGORY_MAP = new Map<string, string[]>([
  ["BYGGINGENIØRER", ["Bygg"]],
  ["DATAINGENIØR/IT", ["Data/IT"]],
  ["ELEKTROINGENIØRER", ["Elektro"]],
  ["ENERGI & MILJØ INGENIØR", ["Energi & Miljø"]],
  ["BIOTEKNOLOGI- OG KJEMIINGENIØR", ["Biotek/Kjemi"]],
  ["MASKINIGENIØRER", ["Maskin"]],
  ["ØKONOMI OG ADMINISTRASJON", ["Økonomi"]],
  ["LEDELSE", ["Ledelse"]],
  ["HUMAN RESOURCES", ["HR"]],
  ["ØKONOMI OG LEDELSE", ["Økonomi", "Ledelse"]],
  ["ØKONOMI/LEDELSE", ["Økonomi", "Ledelse"]],
  ["IT / COMPUTER ENGINEER", ["Data/IT"]],
  ["ELECTRICAL ENGINEER", ["Elektro"]],
  ["MECHANICAL ENGINEER", ["Maskin"]],
  ["CONSTRUCTION ENGINEER", ["Bygg"]],
  ["ECONOMICS AND ADMINISTRATION", ["Økonomi"]],
  ["HUMAN RESOURCES (HR)", ["HR"]],
  ["MANAGEMENT", ["Ledelse"]],
  ["BIOTECHNOLOGY AND CHEMICAL ENGINEER", ["Biotek/Kjemi"]],
]);

const CATEGORY_BY_TOKEN = new Map(
  STUDY_CATEGORIES.map((category) => [normalizeToken(category), category] as const),
);

function normalizeToken(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function mapSingleCategory(rawValue: string): string[] {
  const value = rawValue.trim();
  if (!value) return [];

  if (value.includes(",")) {
    return value
      .split(",")
      .map((part) => part.trim())
      .flatMap(mapSingleCategory);
  }

  const token = normalizeToken(value);
  const directMatch = CATEGORY_BY_TOKEN.get(token);
  if (directMatch) return [directMatch];

  const legacyMatch = LEGACY_CATEGORY_MAP.get(token);
  if (legacyMatch) return legacyMatch;

  if (token.includes("DATA") || token.includes("IT")) return ["Data/IT"];
  if (token.includes("COMPUTER") || token.includes("INFORMAT") || token.includes("SOFTWARE") || token.includes("PROGRAM")) return ["Data/IT"];
  if (token.includes("ØKONOMI") && token.includes("LEDELSE")) return ["Økonomi", "Ledelse"];
  if (token.includes("ØKONOMI") || token.includes("ECONOMICS")) return ["Økonomi"];
  if (token.includes("LEDELSE") || token.includes("MANAGEMENT")) return ["Ledelse"];
  if (token.includes("HR") || token.includes("HUMAN")) return ["HR"];
  if (token.includes("ELEKTRO") || token.includes("ELECTRICAL")) return ["Elektro"];
  if (token.includes("ENERGI")) return ["Energi & Miljø"];
  if (token.includes("BIOTEK") || token.includes("BIOTECH") || token.includes("KJEMI") || token.includes("CHEMICAL")) return ["Biotek/Kjemi"];
  if (token.includes("MASKIN") || token.includes("MECHANICAL")) return ["Maskin"];
  if (token.includes("BYGG") || token.includes("CONSTRUCTION")) return ["Bygg"];

  return [];
}

export function normalizeStudyCategories(values: Array<string | null | undefined>) {
  const normalized: string[] = [];
  const seen = new Set<string>();

  values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .flatMap(mapSingleCategory)
    .forEach((category) => {
      if (seen.has(category)) return;
      seen.add(category);
      normalized.push(category);
    });

  return normalized;
}
