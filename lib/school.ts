export const SCHOOL_OTHER_VALUE = "Other";

export const SCHOOL_OPTIONS = [
  { value: "NTNU", label: "Norges teknisk-naturvitenskapelige universitet (NTNU) – Trondheim" },
  { value: "UiO", label: "Universitetet i Oslo (UiO) – Oslo" },
  { value: "UiB", label: "Universitetet i Bergen (UiB) – Bergen" },
  { value: "UiT", label: "UiT Norges arktiske universitet – Tromsø" },
  { value: "OsloMet", label: "OsloMet – storbyuniversitetet – Oslo" },
  { value: "UiS", label: "Universitetet i Stavanger (UiS) – Stavanger" },
  { value: "UiA", label: "Universitetet i Agder (UiA) – Kristiansand / Grimstad" },
  { value: "NMBU", label: "Norges miljø- og biovitenskapelige universitet (NMBU) – Ås" },
  { value: "USN", label: "Universitetet i Sørøst-Norge (USN) – Bø, Drammen, Kongsberg, Notodden, Porsgrunn, Ringerike, Rauland og Vestfold" },
  { value: "Nord universitet", label: "Nord universitet – Bodø / Levanger m.fl." },
  { value: "INN", label: "Høgskolen i Innlandet / Universitetet i Innlandet (INN)" },
  { value: "VID", label: "VID vitenskapelige høgskole" },
  { value: "MF", label: "MF vitenskapelig høyskole" },
  { value: "Høyskolen Kristiania", label: "Høyskolen Kristiania" },
] as const;

export type SchoolOptionValue = (typeof SCHOOL_OPTIONS)[number]["value"];

const SCHOOL_OPTION_VALUES = new Set<string>(SCHOOL_OPTIONS.map((option) => option.value));

export function isKnownSchoolOption(value: string | null | undefined) {
  return SCHOOL_OPTION_VALUES.has(value?.trim() ?? "");
}

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
    !/(oslomet|uio|ntnu|nmbu|uit|uis|uia|uib|bi|kristiania|usn|nord|inn|vid|mf)\./i.test(value);
}

export function normalizeSchoolName(value: string | null | undefined) {
  const trimmed = value?.trim().replace(/\s+/g, " ") ?? "";
  if (!trimmed) return "";
  if (isPrivateEmail(trimmed)) return "";

  const normalized = normalizeForSchoolMatch(trimmed);
  const compact = normalized.replace(/\s+/g, "");

  if (compact === "other" || compact === "annet") {
    return SCHOOL_OTHER_VALUE;
  }

  const isOsloMetVariant =
    compact === "oslomet" ||
    compact === "odlomet" ||
    compact === "olsomet" ||
    compact === "oslmet" ||
    compact === "osloemet" ||
    compact === "oslomer" ||
    compact === "oslomey" ||
    compact === "metoslo" ||
    normalized === "oslo met" ||
    compact.includes("oslometstorbyuniversitet") ||
    compact.includes("oslometstorbyuniversitetet") ||
    includesAll(compact, ["kjemiingenior", "oslomet"]) ||
    includesAll(compact, ["oslo", "metropolitan", "university"]) ||
    compact.includes("oslometno");

  if (isOsloMetVariant) {
    return "OsloMet";
  }

  const hasKristianiaVariant =
    compact === "hk" ||
    compact.includes("kristiania") ||
    compact.includes("kristania") ||
    compact.includes("kristianai") ||
    compact.includes("krisiania") ||
    compact.includes("kristianka") ||
    compact.includes("kristianina") ||
    compact.includes("kristiannia") ||
    compact.includes("kristianauniversity") ||
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
    compact.includes("bihandelsskole") ||
    compact.includes("bihandelssskole") ||
    compact.includes("handelsskolebi") ||
    compact.includes("handelssskolebi") ||
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
    normalized === "universitetet og oslo" ||
    includesAll(compact, ["university", "oslo"]);

  if (isUioVariant) {
    return "UiO";
  }

  const isUibVariant =
    compact === "uib" ||
    compact.includes("uibno") ||
    normalized === "universitetet i bergen" ||
    includesAll(compact, ["university", "bergen"]);

  if (isUibVariant) {
    return "UiB";
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
    normalized === "universitet i stavanger" ||
    includesAll(compact, ["university", "stavanger"]);

  if (isUisVariant) {
    return "UiS";
  }

  const isUiaVariant =
    compact === "uia" ||
    compact.includes("uiano") ||
    normalized === "universitetet i agder" ||
    includesAll(compact, ["university", "agder"]);

  if (isUiaVariant) {
    return "UiA";
  }

  const isNordVariant =
    compact === "nord" ||
    compact.includes("norduniversitet") ||
    includesAll(compact, ["nord", "university"]);

  if (isNordVariant) {
    return "Nord universitet";
  }

  const isInnVariant =
    compact === "inn" ||
    compact.includes("universitetetinnlandet") ||
    compact.includes("hogskoleniinnlandet") ||
    compact.includes("hoyskoleniinnlandet") ||
    includesAll(compact, ["university", "innlandet"]);

  if (isInnVariant) {
    return "INN";
  }

  const isVidVariant =
    compact === "vid" ||
    compact.includes("vidvitenskapeligehogskole") ||
    compact.includes("vidvitenskapeligehoyskole");

  if (isVidVariant) {
    return "VID";
  }

  const isMfVariant =
    compact === "mf" ||
    compact.includes("mfvitenskapelighoyskole") ||
    compact.includes("mfvitenskapelighogskole");

  if (isMfVariant) {
    return "MF";
  }

  return trimmed;
}

export function resolveSchoolFormValue(school: FormDataEntryValue | string | null | undefined, schoolOther?: FormDataEntryValue | string | null) {
  const selected = String(school ?? "").trim();
  const other = String(schoolOther ?? "").trim();
  if (selected === SCHOOL_OTHER_VALUE) {
    return normalizeSchoolName(other) || SCHOOL_OTHER_VALUE;
  }
  return normalizeSchoolName(selected);
}
