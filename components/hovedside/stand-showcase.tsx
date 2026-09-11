"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { PublicRegistrationStand } from "@/lib/event-registration";
import type { ApprovedCompanyPackageTier } from "@/lib/hovedside/approved-companies";
import { cn } from "@/lib/utils";
import { CompanyInfoModal } from "@/components/hovedside/company-info-modal";

type Props = {
  floorplanImagePath: string;
  floorplanAlt: string;
  floorplanWidth: number;
  floorplanHeight: number;
  stands: PublicRegistrationStand[];
};

const TIER_TEXT: Record<ApprovedCompanyPackageTier, string> = {
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
  standard: "Standard",
};

const AVAILABLE_STAND_STYLES: Record<ApprovedCompanyPackageTier, string> = {
  platinum: "border-[#f6a6bd] bg-[#f7c1cf] text-[#4f1239]",
  gold: "border-[#f0c245] bg-[#ffd85a] text-[#5b3b00]",
  silver: "border-[#7ec8ef] bg-[#b7e7ff] text-[#0f3d57]",
  standard: "border-[#7ecf91] bg-[#c5f1bb] text-[#12411e]",
};

const BOOKED_STAND_STYLES: Record<ApprovedCompanyPackageTier, string> = {
  platinum: "border-[#f6a6bd] shadow-[0_8px_24px_rgba(246,166,189,0.35)]",
  gold: "border-[#f0c245] shadow-[0_8px_24px_rgba(240,194,69,0.3)]",
  silver: "border-[#7ec8ef] shadow-[0_8px_24px_rgba(126,200,239,0.28)]",
  standard: "border-[#7ecf91] shadow-[0_8px_24px_rgba(126,207,145,0.28)]",
};

function getPackageTier(stand: PublicRegistrationStand): ApprovedCompanyPackageTier {
  if (stand.package_tier === "platinum") return "platinum";
  if (stand.package_tier === "gold") return "gold";
  if (stand.package_tier === "silver") return "silver";
  return "standard";
}

function getStandLabel(stand: PublicRegistrationStand) {
  return stand.display_label ?? stand.stand_code;
}

function getTooltipPosition(stand: PublicRegistrationStand) {
  const preferLeft = stand.x > 68;
  const width = 26;
  const left = preferLeft
    ? Math.max(2, stand.x - width - 2)
    : Math.min(72, stand.x + stand.width + 2);
  const top = Math.min(
    92,
    Math.max(4, stand.y + stand.height / 2),
  );

  return {
    left: `${left}%`,
    top: `${top}%`,
    transform: "translateY(-50%)",
  } as const;
}

function getBookingDescription(bookingPreview: NonNullable<PublicRegistrationStand["bookingPreview"]>) {
  return bookingPreview.representationText?.trim() || null;
}

function getLookingForText(bookingPreview: NonNullable<PublicRegistrationStand["bookingPreview"]>) {
  return bookingPreview.candidateSummary?.trim() || "Ikke spesifisert ennå.";
}

function truncateWords(value: string, maxWords: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return value;
  return `${words.slice(0, maxWords).join(" ")}...`;
}

export function StandShowcase({
  floorplanImagePath,
  floorplanAlt,
  floorplanWidth,
  floorplanHeight,
  stands,
}: Props) {
  const [activeStandId, setActiveStandId] = useState<string | null>(null);
  const [selectedStandId, setSelectedStandId] = useState<string | null>(null);

  const visibleStands = useMemo(
    () => stands.filter((stand) => stand.status !== "disabled"),
    [stands],
  );
  const activeStand = useMemo(
    () =>
      visibleStands.find(
        (stand) =>
          stand.id === activeStandId &&
          stand.assigned_application_id &&
          stand.bookingPreview,
      ) ?? null,
    [activeStandId, visibleStands],
  );
  const selectedStand = useMemo(
    () =>
      visibleStands.find(
        (stand) =>
          stand.id === selectedStandId &&
          stand.assigned_application_id &&
          stand.bookingPreview,
      ) ?? null,
    [selectedStandId, visibleStands],
  );
  const bookedCount = useMemo(
    () =>
      visibleStands.filter(
        (stand) => stand.assigned_application_id && stand.bookingPreview,
      ).length,
    [visibleStands],
  );

  return (
    <div className="rounded-[28px] border border-white/14 bg-white/8 p-3 shadow-[0_24px_80px_rgba(20,2,73,0.32)] sm:rounded-[32px] sm:p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-secondary/80">
            Booked stands
          </p>
          <h3 className="mt-1 text-2xl font-bold text-surface">
            Floor plan for Student Connect 2026
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mist/70">
            Tap or hover over a booked stand to see which company has reserved
            the stand and read a short company summary.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
          {bookedCount} booked stands
        </div>
      </div>

      <div className="rounded-[24px] bg-white p-1.5 shadow-[0_24px_80px_rgba(20,2,73,0.18)] sm:rounded-[28px] sm:p-3 md:p-4">
        <div className="mx-auto max-w-[690px]">
          <div
            className="relative w-full overflow-hidden rounded-[22px] bg-[#f6f0ff] sm:rounded-[24px]"
            style={{ aspectRatio: `${floorplanWidth} / ${floorplanHeight}` }}
          >
            <Image
              src={floorplanImagePath}
              alt={floorplanAlt}
              fill
              sizes="(max-width: 767px) calc(100vw - 56px), 690px"
              className="object-contain"
              unoptimized
            />

            {visibleStands.map((stand) => {
              const packageTier = getPackageTier(stand);
              const isBooked = Boolean(
                stand.assigned_application_id && stand.bookingPreview,
              );
              const StandElement = isBooked ? "button" : "div";

              return (
                <StandElement
                  key={stand.id}
                  type={isBooked ? "button" : undefined}
                  aria-label={
                    isBooked && stand.bookingPreview
                      ? `View ${stand.bookingPreview.companyName} at ${getStandLabel(stand)}`
                      : undefined
                  }
                  onClick={
                    isBooked ? () => setSelectedStandId(stand.id) : undefined
                  }
                  onMouseEnter={() => {
                    if (isBooked) setActiveStandId(stand.id);
                  }}
                  onMouseLeave={() => {
                    if (isBooked) setActiveStandId((current) =>
                      current === stand.id ? null : current,
                    );
                  }}
                  onFocus={() => {
                    if (isBooked) setActiveStandId(stand.id);
                  }}
                  onBlur={() => {
                    if (isBooked) setActiveStandId((current) =>
                      current === stand.id ? null : current,
                    );
                  }}
                  style={{
                    left: `${stand.x}%`,
                    top: `${stand.y}%`,
                    width: `${stand.width}%`,
                    height: `${stand.height}%`,
                  }}
                  className={cn(
                    "absolute transition-[border-color,box-shadow,transform] duration-150 motion-reduce:transition-none motion-reduce:transform-none",
                    isBooked
                      ? cn(
                          "z-20 touch-manipulation cursor-pointer rounded-[7px] border-2 border-transparent bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-[#fe6f3f] focus-visible:ring-offset-1",
                          activeStandId === stand.id
                            ? cn(
                                "translate-y-[-1px]",
                                BOOKED_STAND_STYLES[packageTier],
                              )
                            : undefined,
                        )
                      : cn(
                          "z-10 flex items-center justify-center rounded-[6px] border text-center text-[7px] font-bold leading-none tracking-tight md:text-[8px]",
                          AVAILABLE_STAND_STYLES[packageTier],
                        ),
                  )}
                >
                  {!isBooked ? (
                    <span className="block px-0.5">{getStandLabel(stand)}</span>
                  ) : null}
                </StandElement>
              );
            })}

            {activeStand?.bookingPreview ? (
              <div
                style={getTooltipPosition(activeStand)}
                className="pointer-events-none absolute z-30 hidden w-[26%] min-w-[180px] rounded-2xl border border-primary/15 bg-white/98 p-3 text-left shadow-[0_18px_50px_rgba(20,2,73,0.24)] md:block"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#6d28d9]">
                  {TIER_TEXT[getPackageTier(activeStand)]}
                </p>
                <h4 className="mt-1 text-sm font-bold text-primary">
                  {activeStand.bookingPreview.companyName}
                </h4>
                <p className="mt-1 text-xs font-semibold text-ink/65">
                  {getStandLabel(activeStand)}
                </p>
                {getBookingDescription(activeStand.bookingPreview) ? (
                  <p className="mt-2 text-xs leading-relaxed text-ink/80">
                    {truncateWords(
                      getBookingDescription(activeStand.bookingPreview) ?? "",
                      42,
                    )}
                  </p>
                ) : null}
                <p className="mt-2 text-xs leading-relaxed text-ink/82">
                  <span className="font-bold">Looking for:</span>{" "}
                  {truncateWords(getLookingForText(activeStand.bookingPreview), 18)}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {selectedStand?.bookingPreview ? (
        <CompanyInfoModal
          companyName={selectedStand.bookingPreview.companyName}
          logoUrl={selectedStand.bookingPreview.logoUrl}
          representationText={selectedStand.bookingPreview.representationText}
          candidateSummary={selectedStand.bookingPreview.candidateSummary}
          candidateLevelLabel={selectedStand.bookingPreview.candidateLevelLabel}
          packageLabel={TIER_TEXT[getPackageTier(selectedStand)]}
          standLabel={getStandLabel(selectedStand)}
          onClose={() => setSelectedStandId(null)}
        />
      ) : null}
    </div>
  );
}
