import { normalizeStudyCategories } from "@/lib/company-categories";

export type LeadOverviewCompany = {
  id: string;
  name: string | null;
  industry: string | null;
  recruitment_fields: string[] | null;
};
export type LeadOverviewConsent = { company_id: string; student_id: string; consent: boolean };

export function normalizeLeadCategories(company: Pick<LeadOverviewCompany, "industry" | "recruitment_fields">) {
  const sourceCategories = (company.recruitment_fields ?? []).map((field) => field.trim()).filter(Boolean);
  const fallbackCategories = sourceCategories.length ? sourceCategories : [company.industry?.trim()].filter((value): value is string => Boolean(value));
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const category of fallbackCategories) {
    const values = normalizeStudyCategories([category]);
    const displayValues = values.length ? values : [category];
    for (const displayValue of displayValues) {
      if (seen.has(displayValue)) continue;
      seen.add(displayValue);
      normalized.push(displayValue);
    }
  }

  return normalized;
}

export function buildLeadOverview(companies: LeadOverviewCompany[], consents: LeadOverviewConsent[]) {
  const studentsByCompany = new Map<string, Set<string>>();
  for (const row of consents) {
    if (!row.consent || !row.student_id) continue;
    const students = studentsByCompany.get(row.company_id) ?? new Set<string>();
    students.add(row.student_id);
    studentsByCompany.set(row.company_id, students);
  }
  return companies.map((company) => {
    return {
      ...company,
      name: company.name?.trim() || "Uten bedriftsnavn",
      categories: normalizeLeadCategories(company),
      leadCount: studentsByCompany.get(company.id)?.size ?? 0,
    };
  }).sort((a, b) => b.leadCount - a.leadCount || a.name.localeCompare(b.name, "nb") || a.id.localeCompare(b.id));
}

// Supabase caps responses; keep reading until the complete dataset is counted.
export async function readAllLeadOverviewRows<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>, pageSize = 1000): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await fetchPage(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}
