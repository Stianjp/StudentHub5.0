export type StudentAudience = "student" | "young_professional";

export const DEFAULT_STUDENT_AUDIENCE: StudentAudience = "student";

export function studentAudienceFromHost(hostname: string | null | undefined): StudentAudience {
  if (!hostname) return DEFAULT_STUDENT_AUDIENCE;
  const host = hostname.split(":")[0].toLowerCase();
  if (host.startsWith("young-professionals.")) return "young_professional";
  return DEFAULT_STUDENT_AUDIENCE;
}

export function isYoungProfessionalHost(hostname: string | null | undefined) {
  return studentAudienceFromHost(hostname) === "young_professional";
}

export function getStudentAudienceLabel(audience: string | null | undefined) {
  return audience === "young_professional" ? "Young professional" : "Student";
}

export function getStudentAudiencePluralLabel(audience: string | null | undefined) {
  return audience === "young_professional" ? "Young Professionals" : "Students";
}

export function getStudentAudiencePortalName(audience: string | null | undefined) {
  return audience === "young_professional" ? "Young Professionals portal" : "Student portal";
}

export function getStudentAudienceSignInTitle(audience: string | null | undefined) {
  return audience === "young_professional" ? "Young professional sign-in" : "Student sign-in";
}

export function getStudentAudienceRegisterTitle(audience: string | null | undefined) {
  return audience === "young_professional" ? "Register as a young professional" : "Register as a student";
}

export function getStudentAudienceRegisterDescription(audience: string | null | undefined) {
  return audience === "young_professional"
    ? "Create a Young Professionals account with your background, field and job preferences."
    : "Create a student account with your university, field of study and job preferences.";
}

export function getStudentAudienceProfileTitle(audience: string | null | undefined) {
  return audience === "young_professional"
    ? "Complete your young professional profile"
    : "Complete your student profile";
}

export function getStudentAudienceProfileDescription(audience: string | null | undefined) {
  return audience === "young_professional"
    ? "These details improve your company matches and help participating companies understand your background."
    : "These details improve your company matches.";
}
