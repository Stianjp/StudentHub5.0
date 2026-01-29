import { z } from "zod";

export const leadUpsertSchema = z.object({
  email: z.string().email().optional(),
  eventId: z.string().uuid().nullable().optional(),
  studyLevel: z.string().optional().or(z.literal("")),
  studyYear: z.string().optional().or(z.literal("")),
  fieldOfStudy: z.string().optional().or(z.literal("")),
  interests: z.array(z.string()).default([]),
  jobTypes: z.array(z.string()).default([]),
  consentToBeContacted: z.coerce.boolean(),
  source: z.enum(["stand", "student_portal"]),
});
