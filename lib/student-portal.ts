export const STUDENT_EVENT_CAMPAIGN = "student-connect-2026";

export type StudentCompletionFields = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  study_program?: string | null;
  study_level?: string | null;
  study_year?: number | string | null;
  work_style?: string | null;
  social_profile?: string | null;
  team_size?: string | null;
  about?: string | null;
};

export function calcProfileCompletion(student: StudentCompletionFields) {
  const fields = [
    student.full_name, student.email, student.phone, student.study_program,
    student.study_level, student.study_year, student.work_style,
    student.social_profile, student.team_size, student.about,
  ];
  const filled = fields.filter((value) => value !== null && value !== undefined && String(value).trim() !== "").length;
  return Math.round((filled / fields.length) * 100);
}

/** Keep the highest-ranked registration; the public list is already package-sorted. */
export function uniqueParticipatingCompanies<T extends { companyId: string | null }>(companies: T[]): T[] {
  const seen = new Set<string>();
  return companies.filter((company) => {
    if (!company.companyId || seen.has(company.companyId)) return false;
    seen.add(company.companyId);
    return true;
  });
}

/** Only the companies shown in the submitted form may change. */
export function mergeVisibleFavourites(previous: string[], selected: string[], visible: string[]) {
  const visibleIds = new Set(visible);
  return [...new Set([
    ...previous.filter((id) => !visibleIds.has(id)),
    ...selected.filter((id) => visibleIds.has(id)),
  ])];
}
