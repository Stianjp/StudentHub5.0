import type { Metadata } from "next";
import { OpportunityBoard } from "@/components/hovedside/opportunity-board";
import { listPublishedOpportunities } from "@/lib/company-opportunities";

export const metadata: Metadata = {
  title: "Jobs",
  description: "Recent student-friendly jobs, internships and part-time roles from Oslo Student Hub partners.",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function JobsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const opportunities = await listPublishedOpportunities("job");

  return (
    <OpportunityBoard
      title="Recent jobs available"
      intro="Discover internships, part-time roles, and full-time opportunities shared directly by our partner companies."
      opportunities={opportunities}
      searchParams={params}
      mode="job"
    />
  );
}
