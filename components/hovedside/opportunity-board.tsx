import Image from "next/image";
import Link from "next/link";
import { BriefcaseBusiness, GraduationCap, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  formatOpportunityDeadline,
  getOpportunityPrimaryAction,
  getOpportunityStudySummary,
  matchesOpportunityFilters,
} from "@/lib/company-opportunities";
import { OPPORTUNITY_LEVEL_OPTIONS } from "@/lib/company-opportunity-options";
import type { TableRow } from "@/lib/types/database";

type CompanyOpportunity = TableRow<"company_opportunities"> & {
  companyName: string;
  logoUrl: string | null;
};

function getStringList(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value) return [value];
  return [];
}

export function OpportunityBoard({
  title,
  intro,
  opportunities,
  searchParams,
  mode,
}: {
  title: string;
  intro: string;
  opportunities: CompanyOpportunity[];
  searchParams: Record<string, string | string[] | undefined>;
  mode: "job" | "thesis";
}) {
  const selectedFields = getStringList(searchParams.field);
  const selectedLocations = getStringList(searchParams.location);
  const selectedEngagements = getStringList(searchParams.engagement);
  const selectedLevels = getStringList(searchParams.level);

  const fieldOptions = Array.from(
    new Set(opportunities.flatMap((opportunity) => opportunity.field_tags ?? []).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
  const locationOptions = Array.from(
    new Set(opportunities.map((opportunity) => opportunity.location?.trim()).filter(Boolean) as string[]),
  ).sort((a, b) => a.localeCompare(b));
  const engagementOptions = Array.from(
    new Set(opportunities.flatMap((opportunity) => opportunity.engagement_types ?? []).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  const filtered = opportunities.filter((opportunity) =>
    matchesOpportunityFilters(opportunity, {
      fields: selectedFields,
      locations: selectedLocations,
      engagements: selectedEngagements,
      levels: selectedLevels,
    }),
  );

  return (
    <section className="bg-[#F5F0FF] px-4 py-16 text-primary sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">{title}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-primary/70">{intro}</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="h-fit rounded-[30px] bg-white/80 p-6">
            <h2 className="text-2xl font-bold text-primary">Search by</h2>
            <form className="mt-6 grid gap-6">
              <fieldset className="grid gap-3">
                <legend className="text-sm font-bold uppercase tracking-wide text-primary/70">Field of study</legend>
                {fieldOptions.map((field) => (
                  <label key={field} className="flex items-center gap-3 text-sm text-primary">
                    <input type="checkbox" name="field" value={field} defaultChecked={selectedFields.includes(field)} />
                    {field}
                  </label>
                ))}
              </fieldset>

              <fieldset className="grid gap-3">
                <legend className="text-sm font-bold uppercase tracking-wide text-primary/70">Level</legend>
                {OPPORTUNITY_LEVEL_OPTIONS.map((level) => (
                  <label key={level} className="flex items-center gap-3 text-sm text-primary">
                    <input type="checkbox" name="level" value={level} defaultChecked={selectedLevels.includes(level)} />
                    {level}
                  </label>
                ))}
              </fieldset>

              {mode === "job" && engagementOptions.length > 0 ? (
                <fieldset className="grid gap-3">
                  <legend className="text-sm font-bold uppercase tracking-wide text-primary/70">Job type</legend>
                  {engagementOptions.map((engagement) => (
                    <label key={engagement} className="flex items-center gap-3 text-sm text-primary">
                      <input
                        type="checkbox"
                        name="engagement"
                        value={engagement}
                        defaultChecked={selectedEngagements.includes(engagement)}
                      />
                      {engagement}
                    </label>
                  ))}
                </fieldset>
              ) : null}

              {locationOptions.length > 0 ? (
                <fieldset className="grid gap-3">
                  <legend className="text-sm font-bold uppercase tracking-wide text-primary/70">Location</legend>
                  {locationOptions.map((location) => (
                    <label key={location} className="flex items-center gap-3 text-sm text-primary">
                      <input
                        type="checkbox"
                        name="location"
                        value={location}
                        defaultChecked={selectedLocations.includes(location)}
                      />
                      {location}
                    </label>
                  ))}
                </fieldset>
              ) : null}

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-transparent bg-secondary px-6 py-2.5 text-sm font-bold tracking-wide text-primary transition-[background-color,border-color,color,box-shadow,transform] hover:-translate-y-0.5 hover:bg-secondary/85"
                >
                  Apply filters
                </button>
                <Link
                  href={mode === "job" ? "/jobs" : "/thesis-projects"}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-primary/10 px-6 py-2.5 text-sm font-bold tracking-wide text-primary transition hover:bg-primary/5"
                >
                  Reset
                </Link>
              </div>
            </form>
          </Card>

          <div className="grid gap-6">
            {filtered.length === 0 ? (
              <Card className="rounded-[30px] bg-white/80 p-8 text-center">
                <h3 className="text-2xl font-bold text-primary">No matches right now</h3>
                <p className="mt-3 text-primary/70">Try a different combination of field, level, location, or job type.</p>
              </Card>
            ) : (
              filtered.map((opportunity) => {
                const summary = getOpportunityStudySummary(opportunity);
                const primaryAction = getOpportunityPrimaryAction(opportunity);
                return (
                  <Card key={opportunity.id} className="rounded-[32px] bg-white/85 p-6 shadow-[0_24px_60px_rgba(49,23,94,0.08)]">
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <span className="inline-flex w-fit rounded-full bg-[#EEE0FF] px-4 py-2 text-sm font-semibold text-primary/75">
                          Apply by: {formatOpportunityDeadline(opportunity.application_deadline)}
                        </span>
                        {primaryAction ? (
                          <a
                            href={primaryAction.href}
                            target={primaryAction.external ? "_blank" : undefined}
                            rel={primaryAction.external ? "noreferrer" : undefined}
                            className="inline-flex min-h-11 min-w-32 items-center justify-center rounded-full border border-transparent bg-primary px-6 py-2.5 text-sm font-bold tracking-wide text-surface transition hover:-translate-y-0.5 hover:bg-primary/90"
                          >
                            {primaryAction.label}
                          </a>
                        ) : null}
                      </div>

                      <div className="grid gap-6 md:grid-cols-[96px_minmax(0,1fr)]">
                        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-primary/10">
                          {opportunity.logoUrl ? (
                            <Image
                              src={opportunity.logoUrl}
                              alt={`Logo for ${opportunity.companyName}`}
                              width={88}
                              height={88}
                              className="h-20 w-20 object-contain"
                            />
                          ) : (
                            <span className="text-sm font-bold text-primary/50">OSH</span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-3xl font-black text-primary">{opportunity.title}</h3>
                          <p className="mt-1 text-xl font-bold text-primary/85">{opportunity.companyName}</p>
                          {opportunity.contact_email ? (
                            <p className="mt-1 text-sm text-primary/65">Contact: {opportunity.contact_email}</p>
                          ) : null}
                          {opportunity.description ? (
                            <p className="mt-4 max-w-3xl text-sm leading-7 text-primary/72">{opportunity.description}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="flex gap-3">
                          <GraduationCap className="mt-1 h-5 w-5 text-secondary" />
                          <div>
                            <p className="text-sm font-bold text-primary">{summary.fieldsLabel}</p>
                            <p className="mt-1 text-xs text-primary/65">{summary.levelsLabel}</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <BriefcaseBusiness className="mt-1 h-5 w-5 text-secondary" />
                          <div>
                            <p className="text-sm font-bold text-primary">
                              {mode === "job"
                                ? opportunity.engagement_types.join(", ") || "Job opportunity"
                                : opportunity.levels.join(", ")}
                            </p>
                            <p className="mt-1 text-xs text-primary/65">
                              {mode === "job"
                                ? `${opportunity.levels.join(", ")} students`
                                : `Years: ${[...(opportunity.years_bachelor ?? []), ...(opportunity.years_master ?? [])].join(", ") || "Flexible"}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <MapPin className="mt-1 h-5 w-5 text-secondary" />
                          <div>
                            <p className="text-sm font-bold text-primary">{opportunity.location ?? "Norway"}</p>
                            <p className="mt-1 text-xs text-primary/65">Office or project base</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
