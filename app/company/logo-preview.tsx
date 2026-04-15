"use client";

import Image from "next/image";
import { useState } from "react";

type Background = "dark" | "white" | "black";

const backgrounds: { id: Background; label: string; outer: string; inner: string; labelClass: string; buttonActive: string; buttonInactive: string }[] = [
  {
    id: "dark",
    label: "Mørkeblå",
    outer: "bg-primary",
    inner: "bg-[#140249]",
    labelClass: "text-surface/60",
    buttonActive: "bg-surface/20 text-surface",
    buttonInactive: "text-surface/50 hover:text-surface/80",
  },
  {
    id: "white",
    label: "Hvit",
    outer: "bg-mist",
    inner: "bg-white",
    labelClass: "text-primary/60",
    buttonActive: "bg-primary/10 text-primary",
    buttonInactive: "text-primary/40 hover:text-primary/70",
  },
  {
    id: "black",
    label: "Svart",
    outer: "bg-mist",
    inner: "bg-black",
    labelClass: "text-primary/60",
    buttonActive: "bg-primary/10 text-primary",
    buttonInactive: "text-primary/40 hover:text-primary/70",
  },
];

export function LogoPreview({ logoUrl, companyName }: { logoUrl: string; companyName: string }) {
  const [active, setActive] = useState<Background>("dark");
  const bg = backgrounds.find((b) => b.id === active)!;

  return (
    <div className={`rounded-3xl border border-primary/10 p-6 transition-colors ${bg.outer}`}>
      <div className="flex items-center justify-between">
        <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${bg.labelClass}`}>Logo preview</p>
        <div className="flex gap-1">
          {backgrounds.map((b) => (
            <button
              key={b.id}
              onClick={() => setActive(b.id)}
              className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${active === b.id ? b.buttonActive : b.buttonInactive}`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
      <div className={`mt-4 flex min-h-36 items-center justify-center rounded-2xl border border-white/10 p-6 transition-colors ${bg.inner}`}>
        <Image
          src={logoUrl}
          alt={`Logo preview for ${companyName}`}
          width={220}
          height={110}
          className="max-h-24 w-auto object-contain"
        />
      </div>
    </div>
  );
}
