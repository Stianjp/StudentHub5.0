import { cache } from "react";
import { getApprovedCompaniesForCampaign } from "@/lib/hovedside/approved-companies";
import { STUDENT_EVENT_CAMPAIGN, uniqueParticipatingCompanies } from "@/lib/student-portal";

export const listStudentParticipatingCompanies = cache(async () => {
  const companies = await getApprovedCompaniesForCampaign(STUDENT_EVENT_CAMPAIGN);
  return uniqueParticipatingCompanies(companies);
});
