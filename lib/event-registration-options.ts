export const REGISTRATION_STUDENT_FIELDS = [
  "Bygg",
  "Data/IT",
  "Elektro",
  "Energi & Miljø",
  "Biotek/Kjemi",
  "Maskin",
  "Økonomi",
  "Ledelse",
  "HR",
  "Annet",
] as const;

export const REGISTRATION_STAND_NEEDS = [
  "Bord",
  "TV",
  "Mat/snacks/drikke",
  "Annet",
] as const;

export const REGISTRATION_LEVEL_OPTIONS = [
  { value: "bachelor", label: "Bachelor" },
  { value: "master", label: "Master" },
  { value: "both", label: "Both" },
] as const;

export const REGISTRATION_INVOICE_OPTIONS = [
  { value: "ehf", label: "EHF" },
  { value: "email", label: "Email" },
] as const;
