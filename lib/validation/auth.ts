import { z } from "zod";
import {
  isValidStudyProgram,
  mapStudentJobTypes,
  validateStudentStudyChoices,
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
    email: z.string().email("Invalid email address"),
    fullName: z.string().min(2, "Full name is required."),
    school: z.string().min(2, "University or educational institution is required."),
    studyProgram: z
      .string()
      .min(2, "Field of study is required.")
      .refine((value) => isValidStudyProgram(value), "Select a valid field of study."),
    studyLevel: z.string().min(2, "Select bachelor or master."),
    studyYear: z.coerce.number().int().min(1, "Year must be at least 1.").max(5, "Year must be 5 or lower."),
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

    const studyError = validateStudentStudyChoices({
      studyLevel: value.studyLevel,
      studyYear: value.studyYear,
      jobTypes: value.jobTypes,
    });

    if (studyError?.studyLevel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: studyError.studyLevel,
        path: ["studyLevel"],
      });
    }
    if (studyError?.studyYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: studyError.studyYear,
        path: ["studyYear"],
      });
    }
    if (studyError?.jobTypes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: studyError.jobTypes,
        path: ["jobTypes"],
      });
    }
  });

export const companyRegistrationSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    companyName: z.string().min(2, "Company name is required."),
    orgNumber: z
      .string()
      .regex(/^\d{9}$/, "The organisation number must contain 9 digits."),
    address: z.string().min(2, "Address is required."),
    postalCode: z.string().min(2, "Postal code is required."),
    city: z.string().min(2, "City is required."),
    country: z.string().min(2, "Country is required."),
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
