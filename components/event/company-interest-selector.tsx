"use client";

import { useMemo, useState } from "react";

type CompanyOption = {
  id: string;
  name: string;
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
            className="flex items-center gap-2 rounded-xl border border-surface/20 bg-primary/20 px-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              name="companyIds"
              value={company.id}
              checked={selected.has(company.id)}
              onChange={() => toggle(company.id)}
              className="h-4 w-4 rounded border-surface/30 bg-primary text-secondary focus:ring-secondary"
            />
            <span className="font-semibold text-surface">{company.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
