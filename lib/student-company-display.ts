export function normalizeCompanyIndustry(industry: string | null | undefined) {
  const value = industry?.trim() ?? "";
  if (!value || value === "-") return null;
  return value;
}

const STUDENT_CATEGORY_LABELS: Record<string, string> = {
  Bygg: "Construction",
  "Data/IT": "Data/IT",
  Elektro: "Electrical engineering",
  "Energi & Miljø": "Energy & Environment",
  "Biotek/Kjemi": "Biotechnology/Chemistry",
  Maskin: "Mechanical engineering",
  Økonomi: "Economics",
  Ledelse: "Management",
  HR: "HR",
};

export function getStudentCategoryLabel(value: string) {
  return STUDENT_CATEGORY_LABELS[value] ?? value;
}

export function formatRecruitmentFields(
  recruitmentFields: string[] | null | undefined,
) {
  const values = (recruitmentFields ?? [])
    .map((value) => value.trim())
    .filter(Boolean);
  if (values.length === 0) return null;
  return values.map(getStudentCategoryLabel).join(", ");
}

export function getCompanyAudienceLabel(input: {
  industry?: string | null;
  recruitmentFields?: string[] | null;
}) {
  const industry = normalizeCompanyIndustry(input.industry);
  if (industry) return getStudentCategoryLabel(industry);

  const recruitmentFields = formatRecruitmentFields(input.recruitmentFields);
  if (recruitmentFields) {
    return `Looking for: ${recruitmentFields}`;
  }

  return "Student profile not specified";
}
