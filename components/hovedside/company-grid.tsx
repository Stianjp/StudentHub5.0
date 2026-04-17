"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Building2 } from "lucide-react";
import type {
  ApprovedCompanyPackageTier,
  ApprovedCompanyPreview,
} from "@/lib/hovedside/approved-companies";
import { cn } from "@/lib/utils";

type Props = {
  companies: ApprovedCompanyPreview[];
};

const TIER_ORDER: ApprovedCompanyPackageTier[] = [
  "platinum",
  "gold",
  "silver",
  "standard",
];

const TIER_META: Record<
  ApprovedCompanyPackageTier,
  {
    label: string;
    sectionClassName: string;
    gridClassName: string;
    logoFrameClassName: string;
    logoBoxClassName: string;
    chipClassName: string;
  }
> = {
  platinum: {
    label: "Platinum",
    sectionClassName: "border-[#f6a6bd]/30 bg-[#f6a6bd]/10",
    gridClassName: "grid gap-5 md:grid-cols-2 xl:grid-cols-3",
    logoFrameClassName: "rounded-[28px] p-6",
    logoBoxClassName: "h-28",
    chipClassName: "border-[#f6a6bd]/35 bg-[#f6a6bd]/16 text-[#ffe6ef]",
  },
  gold: {
    label: "Gold",
    sectionClassName: "border-[#f0c245]/30 bg-[#f0c245]/10",
    gridClassName: "grid gap-4 md:grid-cols-2 xl:grid-cols-4",
    logoFrameClassName: "rounded-[24px] p-5",
    logoBoxClassName: "h-24",
    chipClassName: "border-[#f0c245]/35 bg-[#f0c245]/16 text-[#fff0c3]",
  },
  silver: {
    label: "Silver",
    sectionClassName: "border-[#7ec8ef]/30 bg-[#7ec8ef]/10",
    gridClassName: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    logoFrameClassName: "rounded-[22px] p-4",
    logoBoxClassName: "h-20",
    chipClassName: "border-[#7ec8ef]/35 bg-[#7ec8ef]/16 text-[#e9f9ff]",
  },
  standard: {
    label: "Standard",
    sectionClassName: "border-[#7ecf91]/30 bg-[#7ecf91]/10",
    gridClassName: "grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5",
    logoFrameClassName: "rounded-[20px] p-4",
    logoBoxClassName: "h-16",
    chipClassName: "border-[#7ecf91]/35 bg-[#7ecf91]/16 text-[#ebffef]",
  },
};

function groupCompanies(companies: ApprovedCompanyPreview[]) {
  return TIER_ORDER.map((tier) => ({
    tier,
    companies: companies.filter((company) => company.packageTier === tier),
  })).filter((group) => group.companies.length > 0);
}

function collectCandidateFields(companies: ApprovedCompanyPreview[]) {
  return [...new Set(companies.flatMap((company) => company.candidateFields))]
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "nb"));
}

export function CompanyGrid({ companies }: Props) {
  const [activeField, setActiveField] = useState<string | null>(null);

  const candidateFields = useMemo(
    () => collectCandidateFields(companies),
    [companies],
  );
  const visibleCompanies = useMemo(() => {
    if (!activeField) return companies;
    return companies.filter((company) =>
      company.candidateFields.includes(activeField),
    );
  }, [activeField, companies]);
  const groupedCompanies = useMemo(
    () => groupCompanies(visibleCompanies),
    [visibleCompanies],
  );

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
    <div className="space-y-6 md:space-y-8">
      {candidateFields.length > 0 ? (
        <div className="rounded-[28px] border border-white/12 bg-white/8 p-4 shadow-[0_16px_42px_rgba(20,2,73,0.18)] sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-secondary/85">
                Filter by student profile
              </p>
              <h3 className="mt-1 text-xl font-bold text-surface">
                Which students are the companies looking for?
              </h3>
            </div>
            {activeField ? (
              <button
                type="button"
                onClick={() => setActiveField(null)}
                className="inline-flex w-full items-center justify-center rounded-full border border-white/14 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white/82 transition hover:border-secondary hover:bg-white/14 sm:w-auto"
              >
                Clear filter
              </button>
            ) : null}
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            <button
              type="button"
              onClick={() => setActiveField(null)}
              className={cn(
                "inline-flex shrink-0 items-center rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition",
                !activeField
                  ? "border-secondary bg-secondary text-primary"
                  : "border-white/14 bg-white/10 text-white/80 hover:border-secondary hover:bg-white/14",
              )}
            >
              All
            </button>
            {candidateFields.map((field) => (
              <button
                key={field}
                type="button"
                onClick={() => setActiveField(field)}
                className={cn(
                  "inline-flex shrink-0 items-center rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition",
                  activeField === field
                    ? "border-secondary bg-secondary text-primary"
                    : "border-white/14 bg-white/10 text-white/80 hover:border-secondary hover:bg-white/14",
                )}
              >
                {field}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {groupedCompanies.length === 0 ? (
        <div className="rounded-[28px] border border-white/12 bg-white/8 py-12 text-center shadow-[0_16px_42px_rgba(20,2,73,0.18)]">
          <p className="text-sm font-semibold text-mist/70">
            No companies match this filter yet.
          </p>
        </div>
      ) : null}

      {groupedCompanies.map(({ tier, companies: tierCompanies }) => {
        const meta = TIER_META[tier];

        return (
          <section
            key={tier}
            className={cn(
              "rounded-[32px] border p-4 shadow-[0_24px_80px_rgba(20,2,73,0.2)] sm:p-5 md:p-6",
              meta.sectionClassName,
            )}
          >
            <div className="mb-5 flex flex-col gap-2 text-center md:flex-row md:items-end md:justify-between md:text-left">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-secondary/85">
                  Attending companies
                </p>
                <h3 className="mt-1 text-2xl font-bold text-surface">
                  {meta.label}
                </h3>
              </div>
              <p className="text-sm font-semibold text-mist/70">
                {tierCompanies.length} confirmed companies
              </p>
            </div>

            <div className={meta.gridClassName}>
              {tierCompanies.map((company) => (
                <article
                  key={company.id}
                  tabIndex={0}
                  className="group relative overflow-hidden rounded-[26px] border border-white/12 bg-white/10 p-3 text-center shadow-[0_12px_32px_rgba(20,2,73,0.16)] sm:p-4"
                >
                  <div
                    className={cn(
                      "relative flex items-center justify-center border border-primary/10 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]",
                      meta.logoFrameClassName,
                    )}
                  >
                    {company.logoUrl ? (
                      <div
                        className={cn(
                          "relative w-full",
                          meta.logoBoxClassName,
                        )}
                      >
                        <Image
                          src={company.logoUrl}
                          alt={company.companyName}
                          fill
                          className="object-contain"
                          sizes="(max-width: 640px) 140px, (max-width: 1024px) 180px, 220px"
                        />
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "flex w-full items-center justify-center rounded-2xl bg-mist/10",
                          meta.logoBoxClassName,
                        )}
                      >
                        <Building2 size={32} className="text-primary/40" />
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-3">
                    <h4 className="text-sm font-bold text-surface sm:text-base">
                      {company.companyName}
                    </h4>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]",
                          meta.chipClassName,
                        )}
                      >
                        {company.packageLabel}
                      </span>
                      {company.standLabel ? (
                        <span className="inline-flex rounded-full border border-white/14 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-mist/85">
                          {company.standLabel}
                        </span>
                      ) : null}
                      {company.candidateLevelLabel ? (
                        <span className="inline-flex rounded-full border border-white/14 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-mist/85">
                          {company.candidateLevelLabel}
                        </span>
                      ) : null}
                    </div>
                    {company.candidateSummary ? (
                      <p className="mx-auto max-w-[24rem] text-sm leading-relaxed text-mist/75">
                        Looking for: {company.candidateSummary}
                      </p>
                    ) : null}
                  </div>

                  <div className="pointer-events-none absolute inset-x-4 bottom-4 translate-y-2 rounded-2xl border border-white/12 bg-[#140249]/95 p-3 text-left opacity-0 shadow-[0_16px_40px_rgba(20,2,73,0.32)] transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-secondary/90">
                      {company.companyName}
                    </p>
                    {company.candidateSummary ? (
                      <p className="mt-2 text-xs leading-relaxed text-white/85">
                        {company.candidateSummary}
                      </p>
                    ) : null}
                    {company.candidateLevelLabel ? (
                      <p className="mt-1 text-xs leading-relaxed text-white/72">
                        {company.candidateLevelLabel}
                      </p>
                    ) : null}
                    {company.standLabel ? (
                      <p className="mt-1 text-xs leading-relaxed text-white/72">
                        Stand: {company.standLabel}
                      </p>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
