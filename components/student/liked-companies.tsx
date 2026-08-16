"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { getCompanyAudienceLabel } from "@/lib/student-company-display";

type CompanyOption = {
  id: string;
  name: string;
  industry: string | null;
  logoUrl?: string | null;
  recruitmentFields?: string[] | null;
};

export function LikedCompanies({
  companies,
  initialSelected,
}: {
  companies: CompanyOption[];
  initialSelected: string[];
}) {
  const [selected, setSelected] = useState<string[]>(initialSelected);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return Array.from(next);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <input name="likedCompanyIds" type="hidden" value={selected.join(",")} readOnly />
      <div className="grid gap-2 md:grid-cols-2">
        {companies.map((company) => {
          const active = selectedSet.has(company.id);
          return (
            <button
              key={company.id}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(company.id)}
              className={`flex min-w-0 flex-col items-stretch justify-between gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-[background-color,border-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE9A70] focus-visible:ring-offset-2 focus-visible:ring-offset-[#140249] sm:flex-row sm:items-center ${
                active
                  ? "!border-secondary bg-secondary/20 text-surface shadow-[0_0_0_3px_#FE9A70]"
                  : "border-surface/20 bg-primary/20 text-surface hover:border-secondary/60 hover:bg-primary/30 hover:shadow-soft"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/95 p-2">
                  {company.logoUrl ? (
                    <Image
                      src={company.logoUrl}
                      alt={`Logo for ${company.name}`}
                      width={48}
                      height={48}
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
                  <span className="flex items-center gap-2 font-semibold">
                    {active ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-primary">
                        ✓
                      </span>
                    ) : null}
                    <span className="truncate">{company.name}</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-surface/70">
                    {getCompanyAudienceLabel({
                      industry: company.industry,
                      recruitmentFields: company.recruitmentFields,
                    })}
                  </span>
                </span>
              </div>
              <Badge className="self-start sm:self-auto" variant={active ? "success" : "default"}>
                {active ? "Favoritt" : "Bedrift"}
              </Badge>
            </button>
          );
        })}
      </div>
      {selected.length > 0 ? (
        <p className="text-xs text-surface/70">Valgt: {selected.length} bedrifter</p>
      ) : (
        <p className="text-xs text-surface/70">Ingen favoritter valgt ennå.</p>
      )}
    </div>
  );
}
