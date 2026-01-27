"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";

type CompanyOption = {
  id: string;
  name: string;
  industry: string | null;
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
              className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-all ${
                active
                  ? "border-secondary bg-secondary/15 text-primary shadow-soft ring-2 ring-secondary ring-offset-2 ring-offset-primary"
                  : "border-surface/60 bg-surface text-primary hover:border-secondary/40 hover:shadow-soft"
              }`}
            >
              <span className="font-semibold">{company.name}</span>
              <Badge variant={active ? "success" : "default"}>{company.industry ?? "Bedrift"}</Badge>
            </button>
          );
        })}
      </div>
      {selected.length > 0 ? (
        <p className="text-xs text-ink/70">Valgt: {selected.length} bedrifter</p>
      ) : (
        <p className="text-xs text-ink/70">Ingen favoritter valgt ennå.</p>
      )}
    </div>
  );
}
