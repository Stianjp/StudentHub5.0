"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type FaqItem = {
  question: string;
  answer: string;
};

type Props = {
  title: string;
  items: FaqItem[];
};

export function FaqAccordion({ title, items }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="mb-10">
      <h3 className="mb-4 text-lg font-bold text-primary">{title}</h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="rounded-xl bg-surface ring-1 ring-primary/5"
          >
            <button
              className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-primary"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            >
              {item.question}
              <ChevronDown
                size={16}
                className={`shrink-0 transition-transform ${
                  openIndex === i ? "rotate-180" : ""
                }`}
              />
            </button>
            {openIndex === i && (
              <div className="border-t border-primary/5 px-5 pb-4 pt-3 text-sm leading-relaxed text-ink/70">
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
