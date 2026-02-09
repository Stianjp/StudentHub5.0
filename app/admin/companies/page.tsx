import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { listCompanyAccessRequests } from "@/lib/admin";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminCompaniesLandingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const saved = params.saved === "1";
  const errorMessage = typeof params.error === "string" ? params.error : "";
  const accessRequests = await listCompanyAccessRequests();

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Bedrifter"
        title="Bedriftadmin"
        description="Velg oppgave for bedriftshåndtering."
      />

      {saved ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">
          Oppdatering lagret.
        </Card>
      ) : null}
      {errorMessage ? (
        <Card className="border border-error/30 bg-error/10 text-sm text-error">
          {decodeURIComponent(errorMessage)}
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <h3 className="text-lg font-bold text-primary">Registrer en bedrift</h3>
          <p className="text-sm text-ink/70">Opprett bedrift, legg til domener og godkjenn tilgang.</p>
          <Link className="button-link text-xs" href="/admin/companies/register">
            Åpne
          </Link>
        </Card>
        <Card className="flex flex-col gap-3">
          <h3 className="text-lg font-bold text-primary">Registrer bedrift til event</h3>
          <p className="text-sm text-ink/70">Koble bedrifter til events og velg pakke.</p>
          <Link className="button-link text-xs" href="/admin/companies/register-event">
            Åpne
          </Link>
        </Card>
        <Card className="flex flex-col gap-3">
          <h3 className="text-lg font-bold text-primary">Oversikt bedrifter</h3>
          <p className="text-sm text-ink/70">Søk, sorter og administrer alle bedrifter.</p>
          <Link className="button-link text-xs" href="/admin/companies/overview">
            Åpne
          </Link>
        </Card>
        <Card className="flex flex-col gap-3">
          <h3 className="text-lg font-bold text-primary">Tilgangsforespørsler</h3>
          <p className="text-sm text-ink/70">Du har {accessRequests.length} forespørsel(er) som venter.</p>
          <Link className="button-link text-xs" href="/admin/companies/register#tilgangsforesporsler">
            Se forespørsler
          </Link>
        </Card>
      </div>
    </div>
  );
}
