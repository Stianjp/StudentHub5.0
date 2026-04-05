export const REGISTRATION_STUDENT_FIELDS = [
  "IT / Computer engineer",
  "Electrical engineer",
  "Mechanical engineer",
  "Construction engineer",
  "Economics and administration",
  "Human resources (HR)",
  "Management",
  "Biotechnology and Chemical Engineer",
  "Law",
  "Mathematical modelling",
  "Other",
] as const;

export const REGISTRATION_STAND_NEEDS = [
  "Tables",
  "TV",
  "Food/snacks/drinks to serve the students",
  "Other",
] as const;

export const REGISTRATION_LEVEL_OPTIONS = [
  { value: "bachelor", label: "Bachelor" },
  { value: "master", label: "Master" },
  { value: "both", label: "Both" },
] as const;

export const REGISTRATION_INVOICE_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "ehf", label: "EHF" },
] as const;
