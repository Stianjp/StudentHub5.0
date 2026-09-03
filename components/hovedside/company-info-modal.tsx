"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Building2, X } from "lucide-react";
import { shouldUseDirectImageUrl } from "@/lib/logo-url";

type Props = {
  companyName: string;
  logoUrl?: string | null;
  representationText?: string | null;
  candidateSummary?: string | null;
  candidateLevelLabel?: string | null;
  packageLabel?: string | null;
  standLabel?: string | null;
  onClose: () => void;
};

export function CompanyInfoModal({
  companyName,
  logoUrl,
  representationText,
  candidateSummary,
  candidateLevelLabel,
  packageLabel,
  standLabel,
  onClose,
}: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const description = representationText?.trim() || null;
  const lookingFor = candidateSummary?.trim() || "Ikke spesifisert ennå.";
  const level = candidateLevelLabel?.trim() || null;

  useEffect(() => {
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0B0130]/72 px-4 py-8 backdrop-blur-sm"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-info-modal-title"
        className="relative w-full max-w-2xl rounded-[28px] border border-white/16 bg-white p-5 text-primary shadow-[0_28px_90px_rgba(11,1,48,0.38)] sm:p-7"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/10 bg-primary/5 text-primary transition hover:bg-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
          aria-label="Lukk popup"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <div className="flex flex-col gap-5 pr-10 sm:flex-row sm:items-start">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-[0_10px_30px_rgba(20,2,73,0.12)]">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={`Logo for ${companyName}`}
                fill
                sizes="96px"
                className="object-contain p-3"
                unoptimized={shouldUseDirectImageUrl(logoUrl)}
              />
            ) : (
              <Building2 size={34} className="text-primary/35" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-secondary">
              Om bedriften
            </p>
            <h2 id="company-info-modal-title" className="mt-2 text-2xl font-bold text-primary">
              {companyName}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {packageLabel ? (
                <span className="rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary/72">
                  {packageLabel}
                </span>
              ) : null}
              {standLabel ? (
                <span className="rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary/72">
                  {standLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 max-h-[48vh] space-y-4 overflow-y-auto">
          {description ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink/82 sm:text-base">
              {description}
            </p>
          ) : null}
          <div className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/70">
              Looking for:
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink/82 sm:text-base">
              {lookingFor}
            </p>
            {level ? (
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary/62">
                {level}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
