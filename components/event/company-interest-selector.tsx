"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { getCompanyAudienceLabel } from "@/lib/student-company-display";

type CompanyOption = {
  id: string;
  name: string;
  logoUrl?: string | null;
  industry?: string | null;
  recruitmentFields?: string[] | null;
};

export function CompanyInterestSelector({
  companies,
  required,
}: {
  companies: CompanyOption[];
  required?: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allIds = useMemo(() => companies.map((company) => company.id), [companies]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(allIds));
  }

  function selectNone() {
    setSelected(new Set());
  }

  return (
    <div className="grid gap-3">
      {required ? (
        <input
          type="checkbox"
          name="companySelectionRequired"
          className="sr-only"
          required
          checked={selected.size > 0}
          onChange={() => {}}
          aria-hidden="true"
          tabIndex={-1}
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={selectAll}
          className="rounded-full border border-surface/20 bg-primary/20 px-3 py-1 text-xs font-semibold text-surface transition-[background-color,border-color,color,box-shadow] hover:border-secondary hover:bg-primary/35 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
        >
          Velg alle
        </button>
        <button
          type="button"
          onClick={selectNone}
          className="rounded-full border border-surface/20 bg-primary/20 px-3 py-1 text-xs font-semibold text-surface transition-[background-color,border-color,color,box-shadow] hover:border-secondary hover:bg-primary/35 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
        >
          Fjern alle
        </button>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {companies.map((company) => (
          <label
            key={company.id}
            className="flex items-center gap-3 rounded-xl border border-primary/30 bg-[#4A3A87] px-3 py-3 text-sm shadow-sm"
          >
            <input
              type="checkbox"
              name="companyIds"
              value={company.id}
              checked={selected.has(company.id)}
              onChange={() => toggle(company.id)}
              className="h-4 w-4 rounded border-surface/30 bg-primary text-secondary focus:ring-secondary"
            />
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/95 p-2">
              {company.logoUrl ? (
                <Image
                  src={company.logoUrl}
                  alt={`Logo for ${company.name}`}
                  width={44}
                  height={44}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-[10px] font-black text-[#140249]">
                  {company.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase() ?? "")
                    .join("")}
                </span>
              )}
            </div>
            <span className="min-w-0">
              <span className="block truncate font-semibold text-surface">
                {company.name}
              </span>
              <span className="mt-0.5 block text-xs text-surface/72">
                {getCompanyAudienceLabel({
                  industry: company.industry,
                  recruitmentFields: company.recruitmentFields,
                })}
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
