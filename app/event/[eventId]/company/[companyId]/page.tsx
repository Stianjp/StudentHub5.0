import { redirect } from "next/navigation";

type StandPageProps = {
  params: Promise<{ eventId: string; companyId: string }>;
};

export default async function StandPage({ params }: StandPageProps) {
  const { eventId, companyId } = await params;
  redirect(`/event/events/${eventId}/companies/${companyId}/register`);
}
