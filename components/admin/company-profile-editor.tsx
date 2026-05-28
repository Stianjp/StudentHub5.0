"use client";

import { useState } from "react";
import { PencilLine, X } from "lucide-react";
import { updateCompanyDetailsAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { TableRow } from "@/lib/types/database";

type Company = Pick<
  TableRow<"companies">,
  | "id"
  | "name"
  | "org_number"
  | "industry"
  | "size"
  | "location"
  | "address"
  | "postal_code"
  | "city"
  | "country"
  | "website"
>;

function displayLocation(company: Company) {
  return company.location ?? ([company.city, company.country].filter(Boolean).join(", ") || "—");
}

function displayWebsite(website: string | null) {
  if (!website) return "—";
  return website;
}

export function CompanyProfileEditor({ company }: { company: Company }) {
  const [isEditing, setIsEditing] = useState(false);
  const location = displayLocation(company);

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Bedrift</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 text-2xl font-bold text-primary">{company.name}</h1>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary/15 bg-surface text-primary shadow-sm transition hover:border-secondary hover:bg-secondary/15 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-mist"
              onClick={() => setIsEditing((current) => !current)}
              title="Endre navn"
              aria-label="Endre navn"
              aria-expanded={isEditing}
              aria-controls={`company-edit-${company.id}`}
            >
              {isEditing ? <X className="h-4 w-4" aria-hidden="true" /> : <PencilLine className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
          <p className="mt-1 text-sm text-ink/70">{company.industry ?? "Bransje ikke satt"}</p>
        </div>
        <div className="text-sm text-ink/70 md:text-right">
          <p>Org.nr: {company.org_number ?? "—"}</p>
          <p>Lokasjon: {location}</p>
          <p>Størrelse: {company.size ?? "—"}</p>
          <p>Nettside: {displayWebsite(company.website)}</p>
        </div>
      </div>

      {isEditing ? (
        <form action={updateCompanyDetailsAction} id={`company-edit-${company.id}`} className="grid gap-4 border-t border-primary/10 pt-5">
          <input type="hidden" name="companyId" value={company.id} />
          <input type="hidden" name="returnTo" value={`/admin/companies/${company.id}`} />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-primary">
              Firmanavn
              <Input name="name" defaultValue={company.name} required />
            </label>
            <label className="text-sm font-semibold text-primary">
              Organisasjonsnummer
              <Input
                name="orgNumber"
                defaultValue={company.org_number ?? ""}
                inputMode="numeric"
                pattern="[0-9]{9}"
                placeholder="987654321"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-primary">
              Bransje
              <Input name="industry" defaultValue={company.industry ?? ""} placeholder="Teknologi" />
            </label>
            <label className="text-sm font-semibold text-primary">
              Størrelse
              <Input name="size" defaultValue={company.size ?? ""} placeholder="50-200" />
            </label>
          </div>
          <label className="text-sm font-semibold text-primary">
            Lokasjon
            <Input name="location" defaultValue={company.location ?? ""} placeholder="Oslo, Norway" />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-primary">
              Adresse
              <Input name="address" defaultValue={company.address ?? ""} placeholder="Gateadresse" />
            </label>
            <label className="text-sm font-semibold text-primary">
              Postnummer
              <Input name="postalCode" defaultValue={company.postal_code ?? ""} placeholder="0000" />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-primary">
              By
              <Input name="city" defaultValue={company.city ?? ""} placeholder="Oslo" />
            </label>
            <label className="text-sm font-semibold text-primary">
              Land
              <Input name="country" defaultValue={company.country ?? ""} placeholder="Norge" />
            </label>
          </div>
          <label className="text-sm font-semibold text-primary">
            Nettside
            <Input name="website" defaultValue={company.website ?? ""} placeholder="https://" />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button type="submit">Lagre endringer</Button>
            <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
              Avbryt
            </Button>
          </div>
        </form>
      ) : null}
    </Card>
  );
}
