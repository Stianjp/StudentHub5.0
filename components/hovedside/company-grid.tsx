"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import type {
  ApprovedCompanyPackageTier,
  ApprovedCompanyPreview,
} from "@/lib/hovedside/approved-companies";
import { cn } from "@/lib/utils";
import { CompanyInfoModal } from "@/components/hovedside/company-info-modal";
import { shouldUseDirectImageUrl } from "@/lib/logo-url";

type Props = {
  companies: ApprovedCompanyPreview[];
  compactOnMobile?: boolean;
};

const MOBILE_COMPANIES_PER_PAGE = 5;

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

function shouldDisplayCompanyLogo(tier: ApprovedCompanyPackageTier) {
  return tier === "platinum" || tier === "gold";
}

function collectCandidateFields(companies: ApprovedCompanyPreview[]) {
  return [...new Set(companies.flatMap((company) => company.candidateFields))]
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "nb"));
}

function getCompanyDescription(company: ApprovedCompanyPreview) {
  return company.representationText?.trim() || null;
}

function getLookingForText(company: ApprovedCompanyPreview) {
  return company.candidateSummary?.trim() || "Ikke spesifisert ennå.";
}

function truncateWords(value: string, maxWords: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return value;
  return `${words.slice(0, maxWords).join(" ")}...`;
}

export function CompanyGrid({ companies, compactOnMobile = false }: Props) {
  const [activeField, setActiveField] = useState<string | null>(null);
  const [showFullCompanyGrid, setShowFullCompanyGrid] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [mobilePage, setMobilePage] = useState(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 640px)");
    const handleChange = () => setShowFullCompanyGrid(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const candidateFields = useMemo(
    () => collectCandidateFields(companies),
    [companies],
  );
  const orderedCompanies = useMemo(
    () => groupCompanies(companies).flatMap((group) => group.companies),
    [companies],
  );
  const mobilePageCount = Math.max(
    1,
    Math.ceil(orderedCompanies.length / MOBILE_COMPANIES_PER_PAGE),
  );
  const safeMobilePage = Math.min(mobilePage, mobilePageCount - 1);
  const mobileCompanies = orderedCompanies.slice(
    safeMobilePage * MOBILE_COMPANIES_PER_PAGE,
    (safeMobilePage + 1) * MOBILE_COMPANIES_PER_PAGE,
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
  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) ?? null,
    [companies, selectedCompanyId],
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

  if (compactOnMobile && !showFullCompanyGrid) {
    return (
      <>
        <div className="space-y-4">
          <div className="rounded-[28px] border border-white/12 bg-white/8 p-5 shadow-[0_16px_42px_rgba(20,2,73,0.18)]">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-secondary/85">
              Attending companies
            </p>
            <h3 className="mt-2 text-xl font-bold text-surface">
              Student Connect 2026 partners
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-mist/75">
              Tap a company to read a short presentation.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {mobileCompanies.map((company) => {
              const meta = TIER_META[company.packageTier];
              const displaysLogo = shouldDisplayCompanyLogo(
                company.packageTier,
              );
              return (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => setSelectedCompanyId(company.id)}
                  className={cn(
                    "rounded-[24px] border p-4 text-left shadow-[0_16px_42px_rgba(20,2,73,0.16)] transition hover:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary",
                    meta.sectionClassName,
                  )}
                >
                  {displaysLogo ? (
                    <div className="relative h-24 overflow-hidden rounded-[18px] border border-primary/10 bg-white">
                      {company.logoUrl ? (
                        <Image
                          src={company.logoUrl}
                          alt={`Logo for ${company.companyName}`}
                          fill
                          sizes="calc(100vw - 64px)"
                          className="object-contain p-3"
                          unoptimized={shouldUseDirectImageUrl(company.logoUrl)}
                        />
                      ) : (
                        <Building2
                          size={34}
                          className="absolute inset-0 m-auto text-primary/35"
                        />
                      )}
                    </div>
                  ) : null}
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-secondary">
                    {meta.label}
                  </p>
                  <h4 className="mt-1 text-base font-bold text-surface">
                    {company.companyName}
                  </h4>
                </button>
              );
            })}
          </div>

          {mobilePageCount > 1 ? (
            <div className="flex items-center justify-between gap-3 rounded-full border border-white/12 bg-white/8 p-2">
              <button
                type="button"
                disabled={safeMobilePage === 0}
                onClick={() => {
                  setSelectedCompanyId(null);
                  setMobilePage((current) => Math.max(0, current - 1));
                }}
                className="min-h-11 rounded-full border border-white/16 px-4 text-xs font-bold uppercase tracking-wider text-surface transition hover:border-secondary disabled:cursor-not-allowed disabled:opacity-35"
              >
                Previous
              </button>
              <p className="text-xs font-semibold text-mist/75">
                {safeMobilePage + 1} / {mobilePageCount}
              </p>
              <button
                type="button"
                disabled={safeMobilePage >= mobilePageCount - 1}
                onClick={() => {
                  setSelectedCompanyId(null);
                  setMobilePage((current) =>
                    Math.min(mobilePageCount - 1, current + 1),
                  );
                }}
                className="min-h-11 rounded-full bg-secondary px-4 text-xs font-bold uppercase tracking-wider text-primary transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-35"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>

        {selectedCompany ? (
          <CompanyInfoModal
            companyName={selectedCompany.companyName}
            logoUrl={
              shouldDisplayCompanyLogo(selectedCompany.packageTier)
                ? selectedCompany.logoUrl
                : null
            }
            representationText={selectedCompany.representationText}
            candidateSummary={selectedCompany.candidateSummary}
            candidateLevelLabel={selectedCompany.candidateLevelLabel}
            packageLabel={selectedCompany.packageLabel}
            standLabel={selectedCompany.standLabel}
            onClose={() => setSelectedCompanyId(null)}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className="space-y-6 md:space-y-8">
        {candidateFields.length > 0 ? (
          <div className="rounded-[28px] border border-white/12 bg-white/8 p-4 shadow-[0_16px_42px_rgba(20,2,73,0.18)] sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-secondary/85">
                Filter by study field
              </p>
              <h3 className="mt-1 text-xl font-bold text-surface">
                Find companies by relevant background
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
              {tierCompanies.map((company) => {
                const description = getCompanyDescription(company);

                return (
                  <article
                    key={company.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Read more about ${company.companyName}`}
                    onClick={() => setSelectedCompanyId(company.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedCompanyId(company.id);
                      }
                    }}
                    className="group relative cursor-pointer overflow-hidden rounded-[26px] border border-white/12 bg-white/10 p-3 text-center shadow-[0_12px_32px_rgba(20,2,73,0.16)] outline-none transition hover:border-secondary/50 focus-visible:ring-2 focus-visible:ring-secondary sm:p-4"
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
                          unoptimized={shouldUseDirectImageUrl(company.logoUrl)}
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
                    </div>
                    {description ? (
                      <p className="mx-auto max-w-[24rem] text-sm leading-relaxed text-mist/75">
                        {truncateWords(description, 28)}
                      </p>
                    ) : null}
                    <p className="mx-auto max-w-[24rem] text-sm leading-relaxed text-mist/82">
                      <span className="font-bold text-surface">Looking for:</span>{" "}
                      {truncateWords(getLookingForText(company), 18)}
                    </p>
                  </div>

                  <div className="pointer-events-none absolute inset-x-4 bottom-4 translate-y-2 rounded-2xl border border-white/12 bg-[#140249]/95 p-3 text-left opacity-0 shadow-[0_16px_40px_rgba(20,2,73,0.32)] transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-secondary/90">
                      {company.companyName}
                    </p>
                    {description ? (
                      <p className="mt-2 text-xs leading-relaxed text-white/85">
                        {truncateWords(description, 46)}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs leading-relaxed text-white/85">
                      <span className="font-bold">Looking for:</span>{" "}
                      {truncateWords(getLookingForText(company), 20)}
                    </p>
                    {company.standLabel ? (
                      <p className="mt-1 text-xs leading-relaxed text-white/72">
                        Stand: {company.standLabel}
                      </p>
                    ) : null}
                  </div>
                </article>
                );
              })}
            </div>
          </section>
          );
        })}
      </div>

      {selectedCompany ? (
        <CompanyInfoModal
          companyName={selectedCompany.companyName}
          logoUrl={selectedCompany.logoUrl}
          representationText={selectedCompany.representationText}
          candidateSummary={selectedCompany.candidateSummary}
          candidateLevelLabel={selectedCompany.candidateLevelLabel}
          packageLabel={selectedCompany.packageLabel}
          standLabel={selectedCompany.standLabel}
          onClose={() => setSelectedCompanyId(null)}
        />
      ) : null}
    </>
  );
}
