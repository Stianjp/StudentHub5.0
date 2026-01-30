import { RegistrationForm } from "@/components/event/registration-form";
import { SectionHeader } from "@/components/ui/section-header";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ eventId: string; companyId: string }>;
};

export default async function CompanyStandRegisterPage({ params }: PageProps) {
  const { eventId, companyId } = await params;
  const supabase = await createServerSupabaseClient();

  const [{ data: event, error: eventError }, { data: company, error: companyError }] =
    await Promise.all([
      supabase.from("events").select("*").eq("id", eventId).single(),
      supabase.from("companies").select("*").eq("id", companyId).single(),
    ]);

  if (eventError || !event) throw eventError ?? new Error("Event not found");
  if (companyError || !company) throw companyError ?? new Error("Company not found");

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
