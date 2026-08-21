import { z } from "zod";

const optionalText = z.string().optional().or(z.literal(""));

const normalizedOrgNumber = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    return value.replace(/\s+/g, "").trim();
  },
  z.union([z.string().regex(/^\d{9}$/, "Org.nr må være 9 siffer."), z.literal("")]),
);

const normalizedWebsite = z.preprocess(
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
);

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
  orgNumber: normalizedOrgNumber.optional().or(z.literal("")),
  industry: optionalText,
  location: optionalText,
  domain: optionalText,
});

export const updateCompanyDetailsSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(2, "Navn er påkrevd."),
  orgNumber: normalizedOrgNumber.optional().or(z.literal("")),
  industry: optionalText,
  size: optionalText,
  location: optionalText,
  address: optionalText,
  postalCode: optionalText,
  city: optionalText,
  country: optionalText,
  website: normalizedWebsite.optional().or(z.literal("")),
});

export const companyDomainSchema = z.object({
  companyId: z.string().uuid(),
  domain: z.string().min(3, "Domene er påkrevd."),
});

export const companyPortalInviteSchema = z.object({
  companyId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email("Skriv inn en gyldig e-postadresse."),
});

export const companyPortalAccessUserSchema = z.object({
  companyId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const approveCompanyAccessSchema = z.object({
  requestId: z.string().uuid(),
  companyId: z.union([z.string().uuid(), z.literal("new")]),
  userId: z.string().uuid(),
  domain: z.string().min(3),
  orgNumber: z.string().regex(/^\d{9}$/).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
});

export const rejectCompanyAccessSchema = z.object({
  requestId: z.string().uuid(),
  companyId: z.string().uuid().optional().or(z.literal("")),
});

export const deleteCompanySchema = z.object({
  companyId: z.string().uuid(),
  confirmationName: z.string().min(1, "Skriv inn bedriftsnavnet for å bekrefte sletting."),
});

export const removeEventCompanySchema = z.object({
  registrationId: z.string().uuid(),
});
