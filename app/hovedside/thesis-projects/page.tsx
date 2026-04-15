import type { Metadata } from "next";
import { OpportunityBoard } from "@/components/hovedside/opportunity-board";
import { listPublishedOpportunities } from "@/lib/company-opportunities";

export const metadata: Metadata = {
  title: "Thesis Projects",
  description: "Find bachelor and master thesis projects published by Oslo Student Hub partner companies.",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ThesisProjectsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const opportunities = await listPublishedOpportunities("thesis");

  return (
    <OpportunityBoard
      title="Thesis projects available"
      intro="Explore bachelor and master thesis opportunities from companies that want to collaborate with students."
      opportunities={opportunities}
      searchParams={params}
      mode="thesis"
    />
  );
}
