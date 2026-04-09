import Image from "next/image";
import { Building2 } from "lucide-react";
import type { ApprovedCompanyPreview } from "@/lib/hovedside/approved-companies";

type Props = {
  companies: ApprovedCompanyPreview[];
};

export function CompanyGrid({ companies }: Props) {
  if (companies.length === 0) {
    return (
      <div className="rounded-2xl bg-white/5 py-12 text-center ring-1 ring-white/10">
        <Building2 size={40} className="mx-auto text-mist/40" />
        <p className="mt-3 text-sm text-mist/60">
          Participating companies will be announced here as they are approved.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {companies.map((company) => (
        <div
          key={company.id}
          className="flex flex-col items-center rounded-2xl bg-white/5 p-6 text-center ring-1 ring-white/10"
        >
          {/* Logo */}
          {company.logoUrl ? (
            <div className="relative mb-4 h-16 w-28">
              <Image
                src={company.logoUrl}
                alt={company.companyName}
                fill
                className="object-contain"
              />
            </div>
          ) : (
            <div className="mb-4 flex h-16 w-28 items-center justify-center rounded-xl bg-mist/10">
              <Building2 size={28} className="text-mist/40" />
            </div>
          )}

          {/* Name */}
          <h3 className="text-sm font-bold text-surface">
            {company.companyName}
          </h3>

          {/* Candidate info */}
          {company.candidateLevelLabel && (
            <span className="mt-2 inline-flex rounded-full bg-secondary/20 px-3 py-0.5 text-xs font-semibold text-secondary">
              {company.candidateLevelLabel}
            </span>
          )}
          {company.candidateSummary && (
            <p className="mt-2 text-xs text-mist/60 line-clamp-2">
              {company.candidateSummary}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
