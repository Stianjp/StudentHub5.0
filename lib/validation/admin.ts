import { z } from "zod";

export const eventSchema = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Slug kan kun inneholde små bokstaver, tall og bindestrek"),
  description: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
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
});
