import { redirect } from "next/navigation";

type StudentEventPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function StudentEventPage({ params }: StudentEventPageProps) {
  const { eventId } = await params;
  void eventId;
  redirect("/student/events");
}
