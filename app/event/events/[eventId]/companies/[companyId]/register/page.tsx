import { notFound } from "next/navigation";
import { RegistrationForm } from "@/components/event/registration-form";
import { SectionHeader } from "@/components/ui/section-header";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

type PageProps = {
  params: Promise<{ eventId: string; companyId: string }>;
};

export const revalidate = 300;

export default async function CompanyStandRegisterPage({ params }: PageProps) {
  const { eventId, companyId } = await params;
  const supabase = createPublicSupabaseClient();

  const [{ data: event, error: eventError }, { data: company, error: companyError }] =
    await Promise.all([
      supabase.from("events").select("*").eq("id", eventId).maybeSingle(),
      supabase.from("companies").select("*").eq("id", companyId).maybeSingle(),
    ]);

  if (eventError) throw eventError;
  if (companyError) throw companyError;
  if (!event || !company) notFound();

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        eyebrow="Standregistrering"
        title={company.name}
        description={`Event: ${event.name}`}
      />
      <RegistrationForm
        eventId={eventId}
        companies={[{ id: company.id, name: company.name }]}
        mode="stand"
        lockedCompany={{ id: company.id, name: company.name }}
      />
    </div>
  );
}
