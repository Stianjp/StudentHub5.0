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

function includesAll(value: string, words: string[]) {
  return words.every((word) => value.includes(word));
}

function isPrivateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) &&
    !/(oslomet|uio|ntnu|nmbu|uit|uis|bi|kristiania|usn)\./i.test(value);
}

export function normalizeSchoolName(value: string | null | undefined) {
  const trimmed = value?.trim().replace(/\s+/g, " ") ?? "";
  if (!trimmed) return "";
  if (isPrivateEmail(trimmed)) return "";

  const normalized = normalizeForSchoolMatch(trimmed);
  const compact = normalized.replace(/\s+/g, "");

  const isOsloMetVariant =
    compact === "oslomet" ||
    compact === "odlomet" ||
    compact === "olsomet" ||
    compact === "osloemet" ||
    normalized === "oslo met" ||
    compact.includes("oslometstorbyuniversitet") ||
    compact.includes("oslometstorbyuniversitetet") ||
    includesAll(compact, ["oslo", "metropolitan", "university"]) ||
    compact.includes("oslometno");

  if (isOsloMetVariant) {
    return "OsloMet";
  }

  const isOsloNyeFagskoleVariant =
    compact === "oslonye fagskole".replace(/\s+/g, "") ||
    compact === "oslonyehoyskole" ||
    includesAll(compact, ["oslo", "nye", "fagskole"]) ||
    includesAll(compact, ["oslo", "nye", "hoyskole"]);

  if (isOsloNyeFagskoleVariant) {
    return "Oslo Nye Fagskole";
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

  const isBiVariant =
    compact === "bi" ||
    compact.includes("bino") ||
    includesAll(compact, ["bi", "norwegian", "business", "school"]) ||
    includesAll(compact, ["bi", "handelshoyskole"]) ||
    compact.includes("handelshoyskolenbi");

  if (isBiVariant) {
    return "BI";
  }

  const isUsnVariant =
    compact === "usn" ||
    compact.includes("usnno") ||
    includesAll(compact, ["universitetet", "sorost", "norge"]) ||
    includesAll(compact, ["university", "south", "eastern", "norway"]);

  if (isUsnVariant) {
    return "USN";
  }

  const isNtnuVariant =
    compact === "ntnu" ||
    compact.includes("ntnuno") ||
    includesAll(compact, ["norges", "teknisk", "naturvitenskapelige", "universitet"]) ||
    includesAll(compact, ["norwegian", "university", "science", "technology"]);

  if (isNtnuVariant) {
    return "NTNU";
  }

  const isNmbuVariant =
    compact === "nmbu" ||
    compact.includes("nmbuno") ||
    includesAll(compact, ["norges", "miljo", "biovitenskapelige", "universitet"]) ||
    includesAll(compact, ["norwegian", "university", "life", "sciences"]);

  if (isNmbuVariant) {
    return "NMBU";
  }

  const isUioVariant =
    compact === "uio" ||
    compact.includes("uiono") ||
    normalized === "universitetet i oslo" ||
    includesAll(compact, ["university", "oslo"]);

  if (isUioVariant) {
    return "UiO";
  }

  const isUitVariant =
    compact === "uit" ||
    compact.includes("uitno") ||
    includesAll(compact, ["universitetet", "tromso"]) ||
    includesAll(compact, ["tromso", "university"]) ||
    includesAll(compact, ["arctic", "university", "norway"]);

  if (isUitVariant) {
    return "UiT";
  }

  const isUisVariant =
    compact === "uis" ||
    compact.includes("uisno") ||
    normalized === "universitetet i stavanger" ||
    includesAll(compact, ["university", "stavanger"]);

  if (isUisVariant) {
    return "UiS";
  }

  return trimmed;
}
