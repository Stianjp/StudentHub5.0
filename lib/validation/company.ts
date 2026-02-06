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
  location: z.string().optional().or(z.literal("")),
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

export const magicLinkSchema = z.object({
  email: z.string().email("Ugyldig e-post"),
  role: z.enum(["student", "company", "admin"]),
  next: z
    .string()
    .nullable()
    .optional()
    .transform((value) => (value === null ? undefined : value)),
});
