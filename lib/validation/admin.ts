import { z } from "zod";

export const eventSchema = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Slug kan kun inneholde små bokstaver, tall og bindestrek"),
  description: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  registrationFormUrl: z.string().url("Ugyldig URL").optional().or(z.literal("")),
  startsAt: z.string().min(10),
  endsAt: z.string().min(10),
  isActive: z.coerce.boolean().default(true),
});

export const inviteCompanySchema = z.object({
  eventId: z.string().uuid(),
  companyId: z.string().uuid(),
  email: z.string().email(),
});

export const setPackageSchema = z.object({
  eventId: z.string().uuid(),
  companyId: z.string().uuid(),
  package: z.enum(["standard", "silver", "gold", "platinum"]),
  accessFrom: z.string().optional().or(z.literal("")),
  accessUntil: z.string().optional().or(z.literal("")),
});

export const registerCompanySchema = z.object({
  eventId: z.string().uuid(),
  companyId: z.string().uuid(),
  standType: z.string().optional().or(z.literal("")),
  package: z.enum(["standard", "silver", "gold", "platinum"]).optional(),
});

export const createCompanySchema = z.object({
  name: z.string().min(2, "Navn er påkrevd."),
  orgNumber: z
    .string()
    .regex(/^\d{9}$/, "Org.nr må være 9 siffer.")
    .optional()
    .or(z.literal("")),
  industry: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  domain: z.string().optional().or(z.literal("")),
});

export const companyDomainSchema = z.object({
  companyId: z.string().uuid(),
  domain: z.string().min(3, "Domene er påkrevd."),
});

export const approveCompanyAccessSchema = z.object({
  requestId: z.string().uuid(),
  companyId: z.union([z.string().uuid(), z.literal("new")]),
  userId: z.string().uuid(),
  domain: z.string().min(3),
  orgNumber: z.string().regex(/^\d{9}$/).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
});
