import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionHeader } from "@/components/ui/section-header";
import {
  JOB_ENGAGEMENT_OPTIONS,
  OPPORTUNITY_BACHELOR_YEARS,
  OPPORTUNITY_LEVEL_OPTIONS,
  OPPORTUNITY_MASTER_YEARS,
} from "@/lib/company-opportunities";
import { STUDY_CATEGORIES } from "@/components/event/study-categories";
import { deleteCompanyOpportunity, saveCompanyOpportunity } from "@/app/company/actions";
import type { TableRow } from "@/lib/types/database";

type CompanyOpportunity = TableRow<"company_opportunities">;

function wordCount(value: string | null) {
  return (value ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function OpportunityEditor({
  opportunity,
  opportunityType,
}: {
  opportunity?: CompanyOpportunity;
  opportunityType: "job" | "thesis";
}) {
  const isJob = opportunityType === "job";
  const title = opportunity?.title ?? "";
  const location = opportunity?.location ?? "";
  const applicationUrl = opportunity?.application_url ?? "";
  const applicationDeadline = opportunity?.application_deadline
    ? new Date(opportunity.application_deadline).toISOString().slice(0, 10)
    : "";
  const fieldTags = opportunity?.field_tags ?? [];
  const levels = opportunity?.levels ?? [];
  const yearsBachelor = opportunity?.years_bachelor ?? [];
  const yearsMaster = opportunity?.years_master ?? [];
  const engagementTypes = opportunity?.engagement_types ?? [];
  const description = opportunity?.description ?? "";

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-bold text-primary">
            {opportunity ? title : isJob ? "Publish new job offer" : "Publish new thesis project"}
          </h3>
          <p className="text-sm text-ink/70">
            Company name and logo are pulled automatically from your company profile.
          </p>
        </div>
        {opportunity ? (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {opportunity.is_published ? "Published" : "Draft"}
          </span>
        ) : null}
      </div>

      <form action={saveCompanyOpportunity} className="grid gap-5">
        <input type="hidden" name="id" value={opportunity?.id ?? ""} />
        <input type="hidden" name="opportunityType" value={opportunityType} />
        <label className="grid gap-2 text-sm font-semibold text-primary">
          Title
          <Input name="title" defaultValue={title} placeholder={isJob ? "Summer internship" : "AI thesis project"} required />
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-semibold text-primary">
            Office / location
            <Input name="location" defaultValue={location} placeholder="Oslo, Norway" required />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-primary">
            Application deadline
            <Input name="applicationDeadline" type="date" defaultValue={applicationDeadline} required />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-primary">
            Application link
            <Input name="applicationUrl" type="url" defaultValue={applicationUrl} placeholder="https://..." required />
          </label>
        </div>

        <fieldset className="grid gap-3">
          <legend className="text-sm font-semibold text-primary">Relevant fields of study</legend>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {STUDY_CATEGORIES.map((field) => (
              <label key={field} className="flex items-center gap-2 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2 text-sm text-ink">
                <input type="checkbox" name="fieldTags" value={field} defaultChecked={fieldTags.includes(field)} />
                {field}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 lg:grid-cols-3">
          <fieldset className="grid gap-3">
            <legend className="text-sm font-semibold text-primary">Bachelor / Master</legend>
            {OPPORTUNITY_LEVEL_OPTIONS.map((level) => (
              <label key={level} className="flex items-center gap-2 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2 text-sm text-ink">
                <input type="checkbox" name="levels" value={level} defaultChecked={levels.includes(level)} />
                {level}
              </label>
            ))}
          </fieldset>

          <fieldset className="grid gap-3">
            <legend className="text-sm font-semibold text-primary">Bachelor year</legend>
            {OPPORTUNITY_BACHELOR_YEARS.map((year) => (
              <label key={year} className="flex items-center gap-2 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2 text-sm text-ink">
                <input type="checkbox" name="yearsBachelor" value={year} defaultChecked={yearsBachelor.includes(year)} />
                Year {year}
              </label>
            ))}
          </fieldset>

          <fieldset className="grid gap-3">
            <legend className="text-sm font-semibold text-primary">Master year</legend>
            {OPPORTUNITY_MASTER_YEARS.map((year) => (
              <label key={year} className="flex items-center gap-2 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2 text-sm text-ink">
                <input type="checkbox" name="yearsMaster" value={year} defaultChecked={yearsMaster.includes(year)} />
                Year {year}
              </label>
            ))}
          </fieldset>
        </div>

        {isJob ? (
          <fieldset className="grid gap-3">
            <legend className="text-sm font-semibold text-primary">Job type</legend>
            <div className="grid gap-2 md:grid-cols-3">
              {JOB_ENGAGEMENT_OPTIONS.map((engagement) => (
                <label key={engagement} className="flex items-center gap-2 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    name="engagementTypes"
                    value={engagement}
                    defaultChecked={engagementTypes.includes(engagement)}
                  />
                  {engagement}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <label className="grid gap-2 text-sm font-semibold text-primary">
          Short description
          <Textarea
            name="description"
            defaultValue={description}
            rows={5}
            placeholder="Max 150 words. Explain what the role or thesis project is about."
          />
          <span className="text-xs font-medium text-ink/60">{wordCount(description)} / 150 words</span>
        </label>

        <label className="flex items-center gap-2 text-sm font-semibold text-primary">
          <input type="checkbox" name="isPublished" defaultChecked={opportunity ? opportunity.is_published : true} />
          Publish immediately
        </label>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="secondary">
            {opportunity ? "Update" : "Publish"}
          </Button>
        </div>
      </form>

      {opportunity ? (
        <form action={deleteCompanyOpportunity}>
          <input type="hidden" name="id" value={opportunity.id} />
          <input type="hidden" name="opportunityType" value={opportunityType} />
          <Button type="submit" variant="ghost" className="border border-primary/10">
            Remove
          </Button>
        </form>
      ) : null}
    </Card>
  );
}

export function OpportunityPublisher({
  title,
  eyebrow,
  description,
  opportunityType,
  hasAccess,
  saved,
  errorMessage,
  opportunities,
}: {
  title: string;
  eyebrow: string;
  description: string;
  opportunityType: "job" | "thesis";
  hasAccess: boolean;
  saved: boolean;
  errorMessage: string;
  opportunities: CompanyOpportunity[];
}) {
  return (
    <div className="flex flex-col gap-8">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} tone="light" />

      {saved ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-surface">
          Changes saved.
        </Card>
      ) : null}
      {errorMessage ? (
        <Card className="border border-error/30 bg-error/10 text-sm text-surface">
          {decodeURIComponent(errorMessage)}
        </Card>
      ) : null}

      {!hasAccess ? (
        <Card className="border border-secondary/30 bg-primary/60 text-surface">
          <h3 className="text-lg font-bold">Publishing is locked for this package</h3>
          <p className="mt-2 text-sm text-surface/85">
            Gold and Platinum include publishing. Silver and Standard can buy this as an add-on.
            Contact <a className="font-semibold text-secondary" href="mailto:stian@oslostudenthub.no">stian@oslostudenthub.no</a> to enable it.
          </p>
        </Card>
      ) : (
        <>
          <OpportunityEditor opportunityType={opportunityType} />
          {opportunities.map((opportunity) => (
            <OpportunityEditor key={opportunity.id} opportunity={opportunity} opportunityType={opportunityType} />
          ))}
        </>
      )}
    </div>
  );
}
