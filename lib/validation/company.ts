import { z } from "zod";

const commaSeparated = z
  .string()
  .optional()
  .transform((value) =>
    value
      ? value
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : [],
  );

const stringArray = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}, z.array(z.string()));

const numberArray = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v));
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isFinite(v));
  }
  return [];
}, z.array(z.number().int()));

export const companyInfoSchema = z.object({
  name: z.string().min(2, "Firmanavn er påkrevd"),
  orgNumber: z
    .string()
    .regex(/^\d{9}$/, "Organisasjonsnummer må være 9 siffer"),
  industry: z.string().optional().or(z.literal("")),
  industryCategories: stringArray.optional(),
  size: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  postalCode: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  website: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      if (!trimmed) return "";
      if (!/^https?:\/\//i.test(trimmed)) {
        return `https://${trimmed}`;
      }
      return trimmed;
    },
    z.union([z.string().url("Nettside må være en gyldig URL"), z.literal("")]),
  ),
});

export const companyRecruitmentSchema = z.object({
  recruitmentRoles: stringArray,
  recruitmentFields: stringArray,
  recruitmentLevels: stringArray,
  recruitmentYearsBachelor: numberArray,
  recruitmentYearsMaster: numberArray,
  recruitmentJobTypes: stringArray,
  recruitmentTiming: stringArray,
});

export const companyBrandingSchema = z.object({
  brandingValues: commaSeparated,
  brandingEvp: z.string().optional().or(z.literal("")),
  brandingMessage: z.string().optional().or(z.literal("")),
  workStyle: z.string().optional().or(z.literal("")),
  socialProfile: z.string().optional().or(z.literal("")),
});

export const companyEventSignupSchema = z.object({
  eventId: z.string().uuid("Ugyldig event"),
  standType: z.string().optional().or(z.literal("")),
  goals: commaSeparated,
  kpis: commaSeparated,
});

export const companyEventGoalsSchema = z.object({
  eventId: z.string().uuid("Ugyldig event"),
  goals: stringArray,
  kpis: stringArray,
});

const normalizedUrl = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  },
  z.union([z.string().url("Søknadslenke må være en gyldig URL"), z.literal("")]),
);

export const companyOpportunitySchema = z
  .object({
    id: z.string().uuid("Ugyldig oppføring").optional().or(z.literal("")),
    opportunityType: z.enum(["job", "thesis"]),
    title: z.string().min(2, "Tittel er påkrevd"),
    location: z.string().min(2, "Lokasjon er påkrevd"),
    applicationUrl: normalizedUrl,
    applicationDeadline: z.string().min(1, "Søknadsfrist er påkrevd"),
    fieldTags: stringArray,
    levels: stringArray,
    yearsBachelor: numberArray,
    yearsMaster: numberArray,
    engagementTypes: stringArray,
    description: z.string().optional().or(z.literal("")),
    isPublished: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.fieldTags.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fieldTags"],
        message: "Velg minst én studieretning.",
      });
    }
    if (value.levels.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["levels"],
        message: "Velg Bachelor og/eller Master.",
      });
    }
    if (value.levels.includes("Bachelor") && value.yearsBachelor.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["yearsBachelor"],
        message: "Velg minst ett bachelor-år.",
      });
    }
    if (value.levels.includes("Master") && value.yearsMaster.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["yearsMaster"],
        message: "Velg minst ett master-år.",
      });
    }
    if (value.opportunityType === "job" && value.engagementTypes.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["engagementTypes"],
        message: "Velg minst én stillingstype.",
      });
    }
    const wordCount = (value.description ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    if (wordCount > 150) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["description"],
        message: "Beskrivelsen kan være maks 150 ord.",
      });
    }
  });

export const magicLinkSchema = z.object({
  email: z.string().email("Ugyldig e-post"),
  role: z.enum(["student", "company", "admin"]),
  next: z
    .string()
    .nullable()
    .optional()
    .transform((value) => (value === null ? undefined : value)),
});
