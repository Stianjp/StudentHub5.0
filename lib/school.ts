function normalizeForSchoolMatch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/&/g, " og ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeSchoolName(value: string | null | undefined) {
  const trimmed = value?.trim().replace(/\s+/g, " ") ?? "";
  if (!trimmed) return "";

  const normalized = normalizeForSchoolMatch(trimmed);
  const compact = normalized.replace(/\s+/g, "");

  const isOsloMetVariant =
    compact === "oslomet" ||
    normalized === "oslo met" ||
    compact.includes("oslometstorbyuniversitet") ||
    compact.includes("oslometstorbyuniversitetet") ||
    (compact.includes("oslo") && compact.includes("metropolitan") && compact.includes("university")) ||
    compact.includes("oslometno");

  if (isOsloMetVariant) {
    return "OsloMet";
  }

  const hasKristianiaVariant =
    compact.includes("kristiania") ||
    compact.includes("kristania") ||
    compact.includes("kristianai") ||
    compact.includes("krisiania") ||
    compact.includes("kristianiacollege") ||
    compact.includes("kristianiauniversitycollege") ||
    compact.includes("kristianiahoyskole") ||
    compact.includes("kristianiahoyskolen") ||
    compact.includes("hoyskolenkristiania") ||
    compact.includes("hoyskolenkristania");

  if (hasKristianiaVariant) {
    return "Høyskolen Kristiania";
  }

  return trimmed;
}
