import { z } from "zod";
import {
  isValidStudyProgram,
  mapStudentJobTypes,
  validateStudentStudyChoices,
} from "@/lib/auth-registration";

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

export const studentProfileSchema = z
  .object({
    fullName: z.string().min(2, "Name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional().or(z.literal("")),
    school: z.string().min(2, "University or educational institution is required"),
    studyProgram: z
      .string()
      .min(2, "Field of study is required")
      .refine((value) => isValidStudyProgram(value), "Select a valid field of study"),
    studyLevel: z.string().min(2, "Study level is required"),
    studyYear: z.coerce.number().int().min(1).max(5),
    jobTypes: commaSeparated.transform((values) => mapStudentJobTypes(values)),
    interests: stringArray,
    values: commaSeparated,
    preferredLocations: commaSeparated,
    willingToRelocate: z.coerce.boolean().default(false),
    likedCompanyIds: commaSeparated,
    about: z.string().max(600).optional().or(z.literal("")),
    workStyle: z.string().optional().or(z.literal("")),
    socialProfile: z.string().optional().or(z.literal("")),
    teamSize: z.string().optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
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
