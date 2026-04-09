"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { PublicRegistrationStand } from "@/lib/event-registration";
import type { ApprovedCompanyPackageTier } from "@/lib/hovedside/approved-companies";
import { cn } from "@/lib/utils";

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

const MOBILE_BOOKED_MARKER_SIZE: Record<ApprovedCompanyPackageTier, string> = {
  platinum: "clamp(44px, 13vw, 58px)",
  gold: "clamp(40px, 12vw, 52px)",
  silver: "clamp(38px, 11vw, 48px)",
  standard: "clamp(34px, 10vw, 44px)",
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

function getCompanyInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
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

function getStandCenter(stand: PublicRegistrationStand) {
  return {
    left: `${stand.x + stand.width / 2}%`,
    top: `${stand.y + stand.height / 2}%`,
  } as const;
}

export function StandShowcase({
  floorplanImagePath,
  floorplanAlt,
  floorplanWidth,
  floorplanHeight,
  stands,
}: Props) {
  const [activeStandId, setActiveStandId] = useState<string | null>(null);

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
  const bookedCount = useMemo(
    () =>
      visibleStands.filter(
        (stand) => stand.assigned_application_id && stand.bookingPreview,
      ).length,
    [visibleStands],
  );

  return (
    <div className="rounded-[32px] border border-white/14 bg-white/8 p-4 shadow-[0_24px_80px_rgba(20,2,73,0.32)] md:p-6">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-secondary/80">
            Bookede stands
          </p>
          <h3 className="mt-1 text-2xl font-bold text-surface">
            Floor plan for Student Connect 2026
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mist/70">
            Tap or hover over a booked logo to see which company has reserved
            the stand and what kind of students they want to meet.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
          {bookedCount} booked stands
        </div>
      </div>

      <div className="rounded-[28px] bg-white p-3 shadow-[0_24px_80px_rgba(20,2,73,0.18)] md:p-4">
        <div
          className="relative w-full overflow-hidden rounded-[24px] bg-[#f6f0ff]"
          style={{ aspectRatio: `${floorplanWidth} / ${floorplanHeight}` }}
        >
          <Image
            src={floorplanImagePath}
            alt={floorplanAlt}
            fill
            sizes="(max-width: 768px) 100vw, 860px"
            className="object-contain"
            priority
            unoptimized
          />

          {visibleStands.map((stand) => {
            const packageTier = getPackageTier(stand);
            const isBooked = Boolean(
              stand.assigned_application_id && stand.bookingPreview,
            );

            return (
              <div
                key={stand.id}
                role={isBooked ? "button" : undefined}
                tabIndex={isBooked ? 0 : undefined}
                aria-label={getStandLabel(stand)}
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
                  "absolute overflow-hidden transition-[transform,box-shadow] duration-150",
                  isBooked
                    ? cn(
                        "z-20 rounded-[7px] border-2 bg-white p-[2px] outline-none md:block",
                        BOOKED_STAND_STYLES[packageTier],
                        activeStandId === stand.id
                          ? "translate-y-[-1px]"
                          : undefined,
                      )
                    : cn(
                        "z-10 flex items-center justify-center rounded-[6px] border text-center text-[7px] font-bold leading-none tracking-tight md:text-[8px]",
                        AVAILABLE_STAND_STYLES[packageTier],
                      ),
                )}
              >
                {isBooked && stand.bookingPreview ? (
                  <div className="relative flex h-full w-full items-center justify-center rounded-[5px] bg-white px-1">
                    {stand.bookingPreview.logoUrl ? (
                      <Image
                        src={stand.bookingPreview.logoUrl}
                        alt={`Logo for ${stand.bookingPreview.companyName}`}
                        fill
                        className="object-contain p-1"
                      />
                    ) : (
                      <span className="text-[7px] font-bold uppercase tracking-tight text-primary md:text-[8px]">
                        {getCompanyInitials(stand.bookingPreview.companyName)}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="block px-0.5">{getStandLabel(stand)}</span>
                )}
              </div>
            );
          })}

          {visibleStands.map((stand) => {
            if (!stand.assigned_application_id || !stand.bookingPreview) {
              return null;
            }

            const packageTier = getPackageTier(stand);
            const center = getStandCenter(stand);

            return (
              <button
                key={`${stand.id}-mobile-marker`}
                type="button"
                aria-label={`Booked stand: ${stand.bookingPreview.companyName}`}
                aria-pressed={activeStandId === stand.id}
                onClick={() =>
                  setActiveStandId((current) =>
                    current === stand.id ? null : stand.id,
                  )
                }
                style={{
                  ...center,
                  width: `calc(${MOBILE_BOOKED_MARKER_SIZE[packageTier]} * 1.05)`,
                  height: MOBILE_BOOKED_MARKER_SIZE[packageTier],
                  transform: "translate(-50%, -50%)",
                }}
                className={cn(
                  "absolute z-30 flex items-center justify-center overflow-hidden rounded-xl border-[2.5px] bg-white p-1.5 shadow-[0_12px_30px_rgba(20,2,73,0.24)] outline-none transition-transform duration-150 md:hidden",
                  BOOKED_STAND_STYLES[packageTier],
                  activeStandId === stand.id
                    ? "scale-[1.04] ring-2 ring-[#FE9A70] ring-offset-2 ring-offset-[#f6f0ff]"
                    : undefined,
                )}
              >
                {stand.bookingPreview.logoUrl ? (
                  <Image
                    src={stand.bookingPreview.logoUrl}
                    alt={`Logo for ${stand.bookingPreview.companyName}`}
                    fill
                    sizes="56px"
                    className="object-contain p-1.5"
                  />
                ) : (
                  <span className="px-1 text-[9px] font-bold uppercase tracking-tight text-primary">
                    {getCompanyInitials(stand.bookingPreview.companyName)}
                  </span>
                )}
              </button>
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
              {activeStand.bookingPreview.candidateSummary ? (
                <p className="mt-2 text-xs leading-relaxed text-ink/80">
                  {activeStand.bookingPreview.candidateSummary}
                </p>
              ) : null}
              {activeStand.bookingPreview.candidateLevelLabel ? (
                <p className="mt-1 text-xs leading-relaxed text-ink/70">
                  Level: {activeStand.bookingPreview.candidateLevelLabel}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {activeStand?.bookingPreview ? (
        <div className="mt-4 rounded-[24px] border border-white/14 bg-white/96 p-4 shadow-[0_18px_50px_rgba(20,2,73,0.22)] md:hidden">
          <div className="flex items-start gap-3">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-[0_8px_24px_rgba(20,2,73,0.12)]">
              {activeStand.bookingPreview.logoUrl ? (
                <Image
                  src={activeStand.bookingPreview.logoUrl}
                  alt={`Logo for ${activeStand.bookingPreview.companyName}`}
                  fill
                  sizes="64px"
                  className="object-contain p-2"
                />
              ) : (
                <span className="px-2 text-center text-[11px] font-bold uppercase tracking-tight text-primary">
                  {getCompanyInitials(activeStand.bookingPreview.companyName)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#6d28d9]">
                {TIER_TEXT[getPackageTier(activeStand)]}
              </p>
              <h4 className="text-sm font-bold leading-tight text-primary">
                {activeStand.bookingPreview.companyName}
              </h4>
              <p className="text-xs font-semibold text-ink/65">
                {getStandLabel(activeStand)}
              </p>
            </div>
          </div>
          {activeStand.bookingPreview.candidateSummary ? (
            <p className="mt-3 text-sm leading-relaxed text-ink/80">
              {activeStand.bookingPreview.candidateSummary}
            </p>
          ) : null}
          {activeStand.bookingPreview.candidateLevelLabel ? (
            <p className="mt-1 text-sm leading-relaxed text-ink/70">
              Level: {activeStand.bookingPreview.candidateLevelLabel}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 rounded-[20px] border border-white/12 bg-white/10 px-4 py-3 text-sm text-mist/72 md:hidden">
          Tap one of the booked logos on the map to see company details.
        </div>
      )}
    </div>
  );
}
