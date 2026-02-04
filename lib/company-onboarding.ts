import type { TableRow } from "@/lib/types/database";

type Company = TableRow<"companies">;

type OnboardingSection = {
  key: "info" | "recruitment" | "branding";
  label: string;
  completed: boolean;
};

export function getCompanyOnboardingStatus(company: Company) {
  const infoCompleted = Boolean(company.name && company.industry && company.location);
  const recruitmentCompleted =
    company.recruitment_fields.length > 0 &&
    company.recruitment_job_types.length > 0 &&
    company.recruitment_levels.length > 0 &&
    (company.recruitment_levels.includes("Bachelor") ? company.recruitment_years_bachelor.length > 0 : true) &&
    (company.recruitment_levels.includes("Master") ? company.recruitment_years_master.length > 0 : true);
  const brandingCompleted =
    company.branding_values.length > 0 || Boolean(company.branding_evp || company.branding_message);

  const sections: OnboardingSection[] = [
    { key: "info", label: "Firma-info", completed: infoCompleted },
    { key: "recruitment", label: "Rekruttering", completed: recruitmentCompleted },
    { key: "branding", label: "Branding", completed: brandingCompleted },
  ];

  const completedCount = sections.filter((section) => section.completed).length;
  const progress = Math.round((completedCount / sections.length) * 100);

  return { sections, completedCount, total: sections.length, progress };
}
