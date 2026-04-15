import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateCompanyForUser } from "@/lib/company";
import { getCompanyOpportunityAccess, listCompanyOpportunities } from "@/lib/company-opportunities";
import { OpportunityPublisher } from "@/components/company/opportunity-publisher";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CompanyJobsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const profile = await requireRole("company");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");

  const company = await getOrCreateCompanyForUser(profile.id, user.email);
  if (!company) {
    return (
      <Card className="border border-warning/30 bg-warning/10 text-sm text-ink/90">
        Bedriftskontoen din er ikke godkjent ennå. En admin må godkjenne tilgang før du kan publisere jobber.
      </Card>
    );
  }

  const [access, opportunities] = await Promise.all([
    getCompanyOpportunityAccess(company.id),
    listCompanyOpportunities(company.id, "job"),
  ]);

  return (
    <OpportunityPublisher
      eyebrow="Publish jobs"
      title="Publish job offers"
      description="Share internships, part-time roles, and full-time openings with students."
      opportunityType="job"
      hasAccess={access.jobPublishingEnabled}
      saved={params.saved === "1"}
      errorMessage={typeof params.error === "string" ? params.error : ""}
      opportunities={opportunities}
    />
  );
}
