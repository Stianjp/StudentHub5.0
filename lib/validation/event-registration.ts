import { z } from "zod";

const stringArray = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}, z.array(z.string()));

const nullableUuid = z
  .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
  .transform((value) => {
    if (!value) return null;
    return value;
  });

export const publicRegistrationApplicationSchema = z
  .object({
    contactFirstName: z.string().min(2, "First name is required."),
    contactLastName: z.string().min(2, "Last name is required."),
    contactEmail: z.string().email("A valid contact email is required."),
    contactPhone: z.string().min(7, "A valid phone number is required."),
    contactJobTitle: z.string().optional().or(z.literal("")),
    companyName: z.string().min(2, "Company name is required."),
    orgNumber: z.string().regex(/^\d{9}$/, "Org. number must be 9 digits."),
    country: z.string().min(2, "Country or region is required."),
    address: z.string().min(2, "Address is required."),
    city: z.string().min(2, "City is required."),
    postalCode: z.string().min(2, "Postal code is required."),
    invoiceDeliveryMethod: z.enum(["ehf", "email"]),
    invoiceEmail: z.union([z.string().email("Invoice email must be valid."), z.literal("")]).optional(),
    invoiceReference: z.string().optional().or(z.literal("")),
    candidateLevel: z.enum(["bachelor", "master", "both"]),
    candidateFields: stringArray.refine((value) => value.length > 0, "Select at least one field."),
    candidateFieldsOther: z.string().optional().or(z.literal("")),
    requestedPackageId: nullableUuid,
    requestedStandId: nullableUuid,
    standNeeds: stringArray,
    standNeedsOther: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
    portalEmails: stringArray
      .transform((value) => value.map((item) => item.toLowerCase()).filter(Boolean))
      .refine((value) => value.length > 0, "At least one portal email is required.")
      .refine((value) => value.length <= 5, "You can register up to 5 portal emails.")
      .refine((value) => new Set(value).size === value.length, "Portal emails must be unique.")
      .refine(
        (value) => value.every((item) => z.string().email().safeParse(item).success),
        "One or more portal emails are invalid.",
      ),
  })
  .superRefine((value, ctx) => {
    if (value.invoiceDeliveryMethod === "email" && !value.invoiceEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["invoiceEmail"],
        message: "Invoice email is required when email invoicing is selected.",
      });
    }
  });

export const registrationCampaignSchema = z.object({
  eventId: z.string().uuid("Invalid event."),
  campaignId: z
    .union([z.string().uuid(), z.literal(""), z.undefined()])
    .transform((value) => value || undefined),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers and hyphen."),
  publicTitle: z.string().min(2, "Title is required."),
  publicSubtitle: z.string().optional().or(z.literal("")),
  publicDescription: z.string().optional().or(z.literal("")),
  floorplanImagePath: z.string().optional().or(z.literal("")),
  emailGroupPrefix: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => value === "" || /^[A-Z0-9-]+$/.test(value), "E-postgruppe-prefiks kan kun inneholde store bokstaver, tall og bindestrek."),
  opensAt: z.string().optional().or(z.literal("")),
  closesAt: z.string().optional().or(z.literal("")),
  isPublished: z.coerce.boolean().default(false),
});

export const registrationPackageSchema = z.object({
  campaignId: z.string().uuid("Invalid campaign."),
  packageId: z
    .union([z.string().uuid(), z.literal(""), z.undefined()])
    .transform((value) => value || undefined),
  packageKey: z.string().min(2, "Package key is required."),
  publicName: z.string().min(2, "Package name is required."),
  description: z.string().optional().or(z.literal("")),
  mappedPackage: z
    .union([z.enum(["standard", "silver", "gold", "platinum"]), z.literal(""), z.undefined()])
    .transform((value) => value || null),
  internalCapacity: z
    .union([z.coerce.number().int().min(0), z.literal(""), z.undefined()])
    .transform((value) => (value === "" || value === undefined ? null : value)),
  isActive: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

export const registrationStandSchema = z.object({
  campaignId: z.string().uuid("Invalid campaign."),
  standId: z
    .union([z.string().uuid(), z.literal(""), z.undefined()])
    .transform((value) => value || undefined),
  standCode: z.string().min(2, "Stand code is required."),
  displayLabel: z.string().optional().or(z.literal("")),
  packageTier: z.enum(["standard", "silver", "gold", "platinum"]),
  x: z.coerce.number().min(0).max(100),
  y: z.coerce.number().min(0).max(100),
  width: z.coerce.number().min(1).max(100),
  height: z.coerce.number().min(1).max(100),
  sortOrder: z.coerce.number().int().default(0),
  status: z.enum(["available", "disabled", "assigned"]).default("available"),
});

export const approveRegistrationApplicationSchema = z.object({
  applicationId: z.string().uuid("Invalid application."),
  approvedPackageId: z.string().uuid("Choose a package before approval."),
  approvedStandId: z
    .union([z.string().uuid(), z.literal(""), z.undefined()])
    .transform((value) => value || null),
});

export const rejectRegistrationApplicationSchema = z.object({
  applicationId: z.string().uuid("Invalid application."),
  rejectionReason: z.string().max(1000).optional().or(z.literal("")),
});

export const resendPortalInviteSchema = z.object({
  inviteId: z.string().uuid("Invalid invite."),
});
