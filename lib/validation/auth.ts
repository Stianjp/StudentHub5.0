import { z } from "zod";
import {
  mapStudentJobTypes,
  validatePasswordStrength,
} from "@/lib/auth-registration";
import { normalizeStudyCategories } from "@/lib/company-categories";

const stringArray = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}, z.array(z.string()));

export const studentRegistrationSchema = z
  .object({
    email: z.string().email("Ugyldig e-post"),
    fullName: z.string().min(2, "Fullt navn er påkrevd."),
    school: z.string().min(2, "Studiested er påkrevd."),
    studyProgram: z.string().min(2, "Studieretning er påkrevd."),
    studyYear: z.coerce.number().int().min(1, "År må være minst 1.").max(8, "År må være 8 eller lavere."),
    jobTypes: stringArray.transform((values) => mapStudentJobTypes(values)),
    password: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((value, ctx) => {
    const passwordError = validatePasswordStrength(value.password, value.confirmPassword);
    if (passwordError) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: passwordError,
        path: ["password"],
      });
    }
  });

export const companyRegistrationSchema = z
  .object({
    email: z.string().email("Ugyldig e-post"),
    companyName: z.string().min(2, "Firmanavn er påkrevd."),
    orgNumber: z
      .string()
      .regex(/^\d{9}$/, "Organisasjonsnummer må være 9 siffer."),
    address: z.string().min(2, "Adresse er påkrevd."),
    postalCode: z.string().min(2, "Postnummer er påkrevd."),
    city: z.string().min(2, "By er påkrevd."),
    country: z.string().min(2, "Land er påkrevd."),
    recruitmentFields: stringArray.transform((values) => normalizeStudyCategories(values)),
    password: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((value, ctx) => {
    const passwordError = validatePasswordStrength(value.password, value.confirmPassword);
    if (passwordError) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: passwordError,
        path: ["password"],
      });
    }
  });
