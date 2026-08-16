"use client";

import { useState } from "react";
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
} from "@/lib/company-opportunity-options";
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
  const editorId = opportunity ? `opportunity-${opportunity.id}` : `new-${opportunityType}`;
  const title = opportunity?.title ?? "";
  const location = opportunity?.location ?? "";
  const applicationUrl = opportunity?.application_url ?? "";
  const contactEmail = opportunity?.contact_email ?? "";
  const applicationDeadline = opportunity?.application_deadline
    ? new Date(opportunity.application_deadline).toISOString().slice(0, 10)
    : "";
  const fieldTags = opportunity?.field_tags ?? [];
  const levels = opportunity?.levels ?? [];
  const yearsBachelor = opportunity?.years_bachelor ?? [];
  const yearsMaster = opportunity?.years_master ?? [];
  const engagementTypes = opportunity?.engagement_types ?? [];
  const description = opportunity?.description ?? "";
  const [descriptionValue, setDescriptionValue] = useState(description);

  return (
    <Card className="flex flex-col gap-5" id={editorId}>
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            <Input name="applicationUrl" type="url" defaultValue={applicationUrl} placeholder="https://..." />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-primary">
            Contact email
            <Input name="contactEmail" type="email" defaultValue={contactEmail} placeholder="jobs@company.com" />
          </label>
        </div>
        <p className="text-xs text-ink/60">
          Application link is optional. If you leave it blank, students will apply by email via the contact email,
          or the company account email if no contact email is entered.
        </p>

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
            value={descriptionValue}
            onChange={(event) => setDescriptionValue(event.target.value)}
            rows={5}
            placeholder="Max 150 words. Explain what the role or thesis project is about."
          />
          <span className="text-xs font-medium text-ink/60">{wordCount(descriptionValue)} / 150 words</span>
        </label>

        <label className="flex items-center gap-2 text-sm font-semibold text-primary">
          <input type="checkbox" name="isPublished" defaultChecked={opportunity ? opportunity.is_published : true} />
          Publish immediately
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button className="w-full sm:w-auto" type="submit" variant="secondary">
            {opportunity ? "Update" : "Publish"}
          </Button>
        </div>
      </form>

      {opportunity ? (
        <form action={deleteCompanyOpportunity} className="w-full sm:w-auto">
          <input type="hidden" name="id" value={opportunity.id} />
          <input type="hidden" name="opportunityType" value={opportunityType} />
          <Button type="submit" variant="ghost" className="w-full border border-primary/10 sm:w-auto">
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
  const publishedCount = opportunities.filter((opportunity) => opportunity.is_published).length;
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
          <Card className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-bold text-primary">Active overview</h3>
                <p className="text-sm text-ink/70">
                  {publishedCount} published and {Math.max(opportunities.length - publishedCount, 0)} draft
                  {opportunities.length === 1 ? "" : "s"}.
                </p>
              </div>
              <a href={`#new-${opportunityType}`} className="inline-flex w-full sm:w-auto">
                <Button className="w-full sm:w-auto" type="button" variant="secondary">Create new</Button>
              </a>
            </div>
            {opportunities.length === 0 ? (
              <p className="text-sm text-ink/70">No {opportunityType === "job" ? "job offers" : "thesis projects"} yet.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {opportunities.map((opportunity) => (
                  <a
                    key={opportunity.id}
                    href={`#opportunity-${opportunity.id}`}
                    className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 transition hover:border-secondary/60 hover:bg-primary/10"
                  >
                    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-primary">{opportunity.title}</p>
                        <p className="mt-1 text-xs text-ink/65">
                          {opportunity.location || "No location"} •{" "}
                          {opportunity.application_deadline
                            ? new Date(opportunity.application_deadline).toLocaleDateString("en-GB")
                            : "Open deadline"}
                        </p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {opportunity.is_published ? "Published" : "Draft"}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </Card>
          <OpportunityEditor opportunityType={opportunityType} />
          {opportunities.map((opportunity) => (
            <OpportunityEditor key={opportunity.id} opportunity={opportunity} opportunityType={opportunityType} />
          ))}
        </>
      )}
    </div>
  );
}
