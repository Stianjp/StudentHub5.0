export function normalizeCompanyIndustry(industry: string | null | undefined) {
  const value = industry?.trim() ?? "";
  if (!value || value === "-") return null;
  return value;
}

export function formatRecruitmentFields(
  recruitmentFields: string[] | null | undefined,
) {
  const values = (recruitmentFields ?? [])
    .map((value) => value.trim())
    .filter(Boolean);
  if (values.length === 0) return null;
  return values.join(", ");
}

export function getCompanyAudienceLabel(input: {
  industry?: string | null;
  recruitmentFields?: string[] | null;
}) {
  const industry = normalizeCompanyIndustry(input.industry);
  if (industry) return industry;

  const recruitmentFields = formatRecruitmentFields(input.recruitmentFields);
  if (recruitmentFields) {
    return `Ser etter: ${recruitmentFields}`;
  }

  return "Studentprofil ikke satt";
}
