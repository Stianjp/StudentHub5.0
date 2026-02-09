"use client";

import { useMemo, useState } from "react";

type CompanyOption = {
  id: string;
  name: string;
};

export function CompanyInterestSelector({ companies }: { companies: CompanyOption[] }) {
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
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={selectAll}
          className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary transition hover:border-secondary hover:text-secondary"
        >
          Velg alle
        </button>
        <button
          type="button"
          onClick={selectNone}
          className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary transition hover:border-secondary hover:text-secondary"
        >
          Fjern alle
        </button>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {companies.map((company) => (
          <label
            key={company.id}
            className="flex items-center gap-2 rounded-xl border border-primary/10 bg-surface px-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              name="companyIds"
              value={company.id}
              checked={selected.has(company.id)}
              onChange={() => toggle(company.id)}
              className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
            />
            <span className="font-semibold text-primary">{company.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
