import { redirect } from "next/navigation";

type KioskPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function KioskPage({ params }: KioskPageProps) {
  const { eventId } = await params;
  redirect(`/event/events/${eventId}/kiosk`);
}
