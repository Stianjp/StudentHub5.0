"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { TableRow } from "@/lib/types/database";

type RegistrationPackage = Pick<
  TableRow<"event_registration_packages">,
  "id" | "public_name" | "mapped_package" | "is_active"
>;
type RegistrationStand = Pick<
  TableRow<"event_registration_stands">,
  "id" | "stand_code" | "display_label" | "package_tier" | "status" | "assigned_application_id"
>;

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  eventId: string;
  campaignId: string;
  applicationId: string;
  slug: string;
  returnTo: string;
  packages: RegistrationPackage[];
  stands: RegistrationStand[];
  currentPackageId: string;
  currentStandId: string;
};

export function ApprovedPackageStandForm({
  action,
  eventId,
  campaignId,
  applicationId,
  slug,
  returnTo,
  packages,
  stands,
  currentPackageId,
  currentStandId,
}: Props) {
  const [selectedPackageId, setSelectedPackageId] = useState(currentPackageId);
  const [selectedStandId, setSelectedStandId] = useState(currentStandId);
  const selectedPackage = packages.find((pkg) => pkg.id === selectedPackageId) ?? null;
  const standOptions = useMemo(() => {
    if (!selectedPackage?.mapped_package) return [];
    return stands.filter((stand) => {
      if (stand.package_tier !== selectedPackage.mapped_package) return false;
      if (stand.id === currentStandId) return true;
      return stand.status === "available" && !stand.assigned_application_id;
    });
  }, [currentStandId, selectedPackage?.mapped_package, stands]);
  const selectedStandStillValid = standOptions.some((stand) => stand.id === selectedStandId);

  return (
    <form action={action} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="campaignId" value={campaignId} />
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <label className="text-sm font-semibold text-primary">
        Godkjent standpakke
        <Select
          name="approvedPackageId"
          required
          value={selectedPackageId}
          onChange={(event) => {
            setSelectedPackageId(event.target.value);
            setSelectedStandId("");
          }}
        >
          <option value="">Velg pakke</option>
          {packages.filter((pkg) => pkg.is_active && pkg.mapped_package).map((pkg) => (
            <option key={pkg.id} value={pkg.id}>
              {pkg.public_name} ({pkg.mapped_package})
            </option>
          ))}
        </Select>
      </label>
      <label className="text-sm font-semibold text-primary">
        Godkjent standplass
        <Select
          name="approvedStandId"
          required
          value={selectedStandStillValid ? selectedStandId : ""}
          onChange={(event) => setSelectedStandId(event.target.value)}
        >
          <option value="">Ingen stand</option>
          {standOptions.map((stand) => (
            <option key={stand.id} value={stand.id}>
              {stand.display_label ?? stand.stand_code} · {stand.package_tier} · {stand.status}
            </option>
          ))}
        </Select>
      </label>
      <Button type="submit" variant="secondary">
        Lagre pakke og stand
      </Button>
    </form>
  );
}
