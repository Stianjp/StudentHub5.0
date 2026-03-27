import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { requireRole } from "@/lib/auth";
import { listContactOverviewOwners } from "@/lib/email-contact-overview";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createContactCompanyAction } from "../actions";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function NewContactOverviewCompanyPage({ searchParams }: PageProps) {
  await requireRole("admin");
  const params = await searchParams;
  const error = firstValue(params.error);
  const supabase = createAdminSupabaseClient();
  const [owners, { data: events }] = await Promise.all([
    listContactOverviewOwners(),
    supabase.from("events").select("id, name").order("starts_at", { ascending: false }),
  ]);
  const typedOwners = owners as Array<{ id: string; full_name: string | null }>;
  const typedEvents = (events ?? []) as Array<{ id: string; name: string }>;

  return (
    <div className="flex flex-col gap-8">
        <SectionHeader
          eyebrow="E-post / Kontaktoversikt"
          title="Opprett ny bedriftsprofil"
          description="Opprett kontaktprofil, velg eier og opprett første sak i samme flyt."
          tone="light"
          actions={
            <Link
              href="/admin/email/contact-overview"
              className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
            >
              Tilbake til kontaktoversikt
            </Link>
          }
        />

        {error ? (
          <Card className="mx-auto w-full max-w-3xl border border-error/30 bg-error/10 text-sm text-error">
            {decodeURIComponent(error)}
          </Card>
        ) : null}

        <Card className="mx-auto flex w-full max-w-3xl flex-col gap-5 border border-[#D46839]/15 bg-white/85">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6E4DB0]">Ny kontaktbedrift</p>
            <h3 className="text-xl font-bold text-[#2D1C63]">Opprett bedriftsprofil</h3>
          </div>

          <form action={createContactCompanyAction} className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-[#2D1C63] md:col-span-2">
              Bedriftsnavn
              <Input name="displayName" required placeholder="F.eks. Equinor" className="border-[#6E4DB0]/20 bg-white" />
            </label>
            <label className="text-sm font-semibold text-[#2D1C63]">
              Primært domene
              <Input name="primaryDomain" required placeholder="equinor.com" className="border-[#6E4DB0]/20 bg-white" />
            </label>
            <label className="text-sm font-semibold text-[#2D1C63]">
              Kontakt-e-post
              <Input name="primaryEmail" placeholder="kontakt@bedrift.no" className="border-[#6E4DB0]/20 bg-white" />
            </label>
            <label className="text-sm font-semibold text-[#2D1C63]">
              Sakseier
              <Select name="ownerProfileId" defaultValue="" className="border-[#6E4DB0]/25 bg-white">
                <option value="">Utdelt senere</option>
                {typedOwners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.full_name ?? "Admin"}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm font-semibold text-[#2D1C63]">
              Knytt første sak til event
              <Select name="eventId" defaultValue="" className="border-[#6E4DB0]/25 bg-white">
                <option value="">Uten event</option>
                {typedEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </Select>
            </label>
            <Button type="submit" className="md:col-span-2">
              Opprett ny bedriftsprofil
            </Button>
          </form>
        </Card>
    </div>
  );
}
