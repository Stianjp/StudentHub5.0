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

export const companyInfoSchema = z.object({
  name: z.string().min(2, "Firmanavn er påkrevd"),
  orgNumber: z.string().optional().or(z.literal("")),
  industry: z.string().optional().or(z.literal("")),
  size: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  website: z.string().url("Nettside må være en gyldig URL").optional().or(z.literal("")),
});

export const companyRecruitmentSchema = z.object({
  recruitmentRoles: commaSeparated,
  recruitmentFields: commaSeparated,
  recruitmentLevels: commaSeparated,
  recruitmentJobTypes: commaSeparated,
  recruitmentTiming: commaSeparated,
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

export const magicLinkSchema = z.object({
  email: z.string().email("Ugyldig e-post"),
  role: z.enum(["student", "company", "admin"]),
  next: z.string().optional(),
});
