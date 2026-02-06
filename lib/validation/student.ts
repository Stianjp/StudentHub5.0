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

export const studentProfileSchema = z.object({
  fullName: z.string().min(2, "Navn er påkrevd"),
  email: z.string().email("Ugyldig e-post"),
  phone: z.string().optional().or(z.literal("")),
  studyProgram: z.string().min(2, "Studie/program er påkrevd"),
  studyLevel: z.string().min(2, "Nivå er påkrevd"),
  graduationYear: z.coerce.number().int().min(2020).max(2100),
  jobTypes: commaSeparated,
  interests: stringArray,
  values: commaSeparated,
  preferredLocations: commaSeparated,
  willingToRelocate: z.coerce.boolean().default(false),
  likedCompanyIds: commaSeparated,
  about: z.string().max(600).optional().or(z.literal("")),
});

export const consentSchema = z.object({
  eventId: z.string().uuid().optional().nullable(),
  companyId: z.string().uuid(),
  consent: z.coerce.boolean(),
  scope: z.string().min(3).default("contact"),
  answers: z
    .object({
      motivation: z.string().optional(),
      timing: z.string().optional(),
      skills: z.string().optional(),
    })
    .partial(),
});

export const kioskSurveySchema = z.object({
  eventId: z.string().uuid(),
  studyProgram: z.string().min(2),
  studyLevel: z.string().min(2),
  jobTypes: commaSeparated,
  interests: commaSeparated,
  values: commaSeparated,
});
