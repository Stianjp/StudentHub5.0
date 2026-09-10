"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useState } from "react";
import { TriangleAlert, UsersRound } from "lucide-react";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CrmPipelineBoard } from "@/lib/crm-pipelines";
import {
  addCustomCrmPipelineStage,
  addGalaDinnerCompanyAction,
  createCustomCrmPipeline,
  deleteCustomCrmPipeline,
  deleteCustomCrmPipelineStage,
  moveCustomCrmPipelineCompany,
  removeGalaDinnerCompanyAction,
  renameCustomCrmPipeline,
  renameCustomCrmPipelineStage,
} from "@/app/admin/crm/actions";

type CrmPipelineManagerProps = {
  pipelines: CrmPipelineBoard[];
  initialPipelineId?: string;
};

const PACKAGE_LABELS = {
  standard: "Standard",
  silver: "Sølv",
  gold: "Gull",
  platinum: "Platinum",
} as const;

function PipelineBoard({ pipeline }: { pipeline: CrmPipelineBoard }) {
  const companyCount = pipeline.stages.reduce((total, stage) => total + stage.companies.length, 0);

  return (
    <Card id={`pipeline-${pipeline.id}`} className="flex scroll-mt-24 flex-col gap-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">
            {pipeline.kind === "gala_dinner"
              ? "Gallamiddag"
              : pipeline.is_default
                ? "Standardpipeline"
                : "Egen pipeline"}
          </p>
          <h2 className="text-xl font-bold text-primary">{pipeline.name}</h2>
          <p className="text-sm text-ink/70">
            {pipeline.kind === "gala_dinner"
              ? "Administrer bedrifter, påmeldte middagsgjester og allergener for arrangementet."
              : pipeline.is_default
                ? "Synkroniseres med betalings- og kontraktstatus i resten av CRM-systemet."
                : "Hver bedrift kan flyttes uavhengig av de andre pipelinebrettene."}
          </p>
          {pipeline.kind === "gala_dinner" ? (
            <dl className="mt-4 flex flex-wrap gap-3">
              <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
                <dt className="text-xs font-semibold text-ink/70">Aktive bedrifter</dt>
                <dd className="text-xl font-bold tabular-nums text-primary">{companyCount}</dd>
              </div>
              <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
                <dt className="text-xs font-semibold text-ink/70">Påmeldte deltakere</dt>
                <dd className="text-xl font-bold tabular-nums text-primary">{pipeline.totalAttendees}</dd>
              </div>
            </dl>
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-2 xl:max-w-xl">
          <form action={renameCustomCrmPipeline} className="flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="pipelineId" value={pipeline.id} />
            <Input name="name" defaultValue={pipeline.name} aria-label="Pipelinenavn" required maxLength={120} />
            <Button type="submit" variant="secondary" className="shrink-0">Endre navn</Button>
          </form>
          {!pipeline.is_default ? (
            <ConfirmActionForm
              action={deleteCustomCrmPipeline}
              fields={{ pipelineId: pipeline.id }}
              label="Slett pipeline"
              confirmMessage={`Slette pipelinen «${pipeline.name}»? Alle data i denne pipelinen slettes.`}
              className="self-start sm:self-end"
            />
          ) : null}
        </div>
      </div>

      {pipeline.kind === "gala_dinner" ? (
        <details className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
          <summary className="cursor-pointer text-sm font-bold text-primary">Administrer bedrifter</summary>
          <form action={addGalaDinnerCompanyAction} className="mt-4 flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="pipelineId" value={pipeline.id} />
            <label className="flex-1 text-sm font-semibold text-primary">
              Bedrift knyttet til arrangementet
              <Select name="companyId" required defaultValue="">
                <option value="" disabled>Velg bedrift</option>
                {pipeline.availableCompanies.map((company) => (
                  <option key={company.companyId} value={company.companyId}>
                    {company.company} ({PACKAGE_LABELS[company.packageTier]})
                  </option>
                ))}
              </Select>
            </label>
            <Button type="submit" variant="secondary" disabled={pipeline.availableCompanies.length === 0}>
              Legg til bedrift
            </Button>
          </form>
          {pipeline.availableCompanies.length === 0 ? (
            <p className="mt-3 text-sm text-ink/70">Alle arrangementsbedrifter er allerede i pipelinen.</p>
          ) : null}
        </details>
      ) : null}

      {!pipeline.is_default ? (
        <details className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
          <summary className="cursor-pointer text-sm font-bold text-primary">Administrer kolonner</summary>
          <div className="mt-4 grid gap-3">
            {pipeline.stages.map((stage) => (
              <div key={stage.id} className="flex flex-col gap-2 rounded-xl border border-primary/15 p-3 md:flex-row md:items-center">
                <form action={renameCustomCrmPipelineStage} className="flex flex-1 flex-col gap-2 sm:flex-row">
                  <input type="hidden" name="stageId" value={stage.id} />
                  <Input name="name" defaultValue={stage.name} aria-label={`Navn på kolonnen ${stage.name}`} required maxLength={80} />
                  <Button type="submit" variant="secondary" className="shrink-0 rounded-xl px-4 py-2 text-xs">Endre</Button>
                </form>
                {pipeline.stages.length > 1 ? (
                  <ConfirmActionForm
                    action={deleteCustomCrmPipelineStage}
                    fields={{ pipelineId: pipeline.id, stageId: stage.id }}
                    label="Slett kolonne"
                    confirmMessage={`Slette kolonnen «${stage.name}»? Bedriftene flyttes til første tilgjengelige kolonne.`}
                  />
                ) : null}
              </div>
            ))}

            <form action={addCustomCrmPipelineStage} className="flex flex-col gap-2 border-t border-primary/15 pt-4 sm:flex-row">
              <input type="hidden" name="pipelineId" value={pipeline.id} />
              <Input name="name" placeholder="Navn på ny kolonne" aria-label="Navn på ny kolonne" required maxLength={80} />
              <Button type="submit" variant="secondary" className="shrink-0">Legg til kolonne</Button>
            </form>
          </div>
        </details>
      ) : null}

      <div className="overflow-x-auto pb-2 [overscroll-behavior-inline:contain]">
        <div
          className="grid min-w-max gap-4"
          style={{ gridTemplateColumns: `repeat(${Math.max(pipeline.stages.length, 1)}, minmax(18rem, 21rem))` }}
        >
          {pipeline.stages.map((stage) => (
            <section key={stage.id} className="flex min-h-[18rem] flex-col rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-primary">{stage.name}</h3>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold tabular-nums text-primary">
                  {stage.companies.length}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-3">
                {stage.companies.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-primary/20 p-4 text-xs text-ink/70">
                    Ingen bedrifter i denne kolonnen.
                  </p>
                ) : (
                  stage.companies.map((company) => (
                    <article key={company.key} className="rounded-2xl border border-white/15 bg-[#1B0858] p-4 text-white">
                      {pipeline.kind === "gala_dinner" && company.membershipId ? (
                        <Link
                          href={`/admin/crm/gallamiddag/${company.membershipId}`}
                          className="inline-flex min-h-6 items-center text-sm font-bold text-white underline decoration-[#FFC4AA] underline-offset-4 hover:text-[#FFC4AA] focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFC4AA]"
                        >
                          {company.company}
                        </Link>
                      ) : (
                        <h4 className="text-sm font-bold text-white">{company.company}</h4>
                      )}

                      {pipeline.kind === "gala_dinner" ? (
                        <div className="mt-3 grid gap-2">
                          <p className="text-xs text-white/80">
                            Pakke: <span className="font-semibold text-white">{company.packageTier ? PACKAGE_LABELS[company.packageTier] : "Ukjent"}</span>
                          </p>
                          <p className="flex items-center gap-2 text-xs text-white/80">
                            <UsersRound aria-hidden="true" className="size-4" />
                            <span className="font-semibold tabular-nums text-white">{company.dinnerAttendeeCount}</span>
                            {company.dinnerAttendeeCount === 1 ? "deltaker" : "deltakere"}
                          </p>
                          {company.hasAllergens ? (
                            <p className="inline-flex w-fit items-center gap-1.5 rounded-full border border-red-300 bg-red-950 px-2.5 py-1 text-xs font-bold text-red-100">
                              <TriangleAlert aria-hidden="true" className="size-4" />
                              Allergener
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <>
                          {company.contacts.length > 0 ? (
                            <div className="mt-2 grid gap-2 rounded-xl border border-white/15 bg-white/5 p-3">
                              {company.contacts.map((contact) => (
                                <div key={contact.id} className="text-xs text-white/80">
                                  <p className="font-semibold text-white">
                                    {contact.contact_type === "primary" ? "Primærkontakt" : "Sekundærkontakt"}: {contact.name}
                                  </p>
                                  {contact.job_title ? <p className="text-white/70">{contact.job_title}</p> : null}
                                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                    {contact.email ? (
                                      <a className="break-all font-semibold text-[#FFC4AA] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFC4AA]" href={`mailto:${contact.email}`}>
                                        {contact.email}
                                      </a>
                                    ) : null}
                                    {contact.phone ? (
                                      <a className="font-semibold text-[#FFC4AA] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFC4AA]" href={`tel:${contact.phone.replace(/\s+/g, "")}`}>
                                        {contact.phone}
                                      </a>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                          <p className="mt-2 text-xs text-white/75">{company.eventName || "Uten event"}</p>
                          {company.totalContacts > 0 ? (
                            <p className="mt-2 text-xs text-white/75">
                              {company.totalContacts} kontakt{company.totalContacts === 1 ? "" : "er"} · {company.openLeadCount} åpne
                            </p>
                          ) : null}
                        </>
                      )}

                      <form action={moveCustomCrmPipelineCompany} className="mt-3 flex flex-col gap-2">
                        <input type="hidden" name="pipelineId" value={pipeline.id} />
                        <input type="hidden" name="companyKey" value={company.key} />
                        <input type="hidden" name="companyId" value={company.companyId ?? ""} />
                        <input type="hidden" name="eventId" value={company.eventId ?? ""} />
                        <input type="hidden" name="company" value={company.company} />
                        <input type="hidden" name="eventName" value={company.eventName} />
                        <Select name="stageId" defaultValue={stage.id} aria-label={`Flytt ${company.company}`}>
                          {pipeline.stages.map((option) => (
                            <option key={option.id} value={option.id}>{option.name}</option>
                          ))}
                        </Select>
                        <Button type="submit" variant="secondary" className="rounded-xl px-4 py-2 text-xs">Flytt bedrift</Button>
                      </form>

                      {pipeline.kind === "gala_dinner" && company.membershipId ? (
                        <ConfirmActionForm
                          action={removeGalaDinnerCompanyAction}
                          fields={{ pipelineId: pipeline.id, membershipId: company.membershipId }}
                          label="Fjern bedrift"
                          confirmMessage={`Fjerne «${company.company}» fra gallamiddag-pipelinen? Deltakere og allergener beholdes.`}
                          className="mt-2 w-full border-red-300/60 text-red-100 hover:bg-red-950"
                        />
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function CrmPipelineManager({ pipelines, initialPipelineId }: CrmPipelineManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialSelection = pipelines.some((pipeline) => pipeline.id === initialPipelineId)
    ? initialPipelineId ?? ""
    : pipelines[0]?.id ?? "";
  const [selectedPipelineId, setSelectedPipelineId] = useState(initialSelection);
  const selectedPipeline = pipelines.find((pipeline) => pipeline.id === selectedPipelineId) ?? pipelines[0];

  function selectPipeline(pipelineId: string) {
    setSelectedPipelineId(pipelineId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("pipeline", pipelineId);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  return (
    <section className="flex flex-col gap-5" aria-labelledby="crm-pipelines-heading">
      <Card className="flex flex-col gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Pipelinebygger</p>
          <h2 id="crm-pipelines-heading" className="text-xl font-bold text-primary">Administrer pipelines</h2>
          <p className="text-sm text-ink/70">Velg pipeline for å administrere kolonner og bedrifter.</p>
        </div>

        {pipelines.length > 0 ? (
          <label className="max-w-xl text-sm font-semibold text-primary">
            Pipeline som skal vises
            <Select value={selectedPipeline?.id ?? ""} onChange={(event) => selectPipeline(event.target.value)}>
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>
              ))}
            </Select>
          </label>
        ) : null}

        <details className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
          <summary className="cursor-pointer text-sm font-bold text-primary">Lag ny pipeline</summary>
          <form action={createCustomCrmPipeline} className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] xl:items-end">
            <label className="text-sm font-semibold text-primary">
              Navn på pipeline
              <Input name="name" placeholder="For eksempel Pipeline 3" required maxLength={120} />
            </label>
            <label className="text-sm font-semibold text-primary">
              Kolonner, én per linje
              <Textarea name="stageNames" defaultValue={"Bedrift\nPågår\nFerdig"} required rows={4} className="min-h-28" />
            </label>
            <Button type="submit" variant="secondary" className="xl:mb-1">Opprett pipeline</Button>
          </form>
        </details>
      </Card>

      {!selectedPipeline ? (
        <Card className="text-sm text-ink/80">Ingen pipelines er opprettet ennå.</Card>
      ) : (
        <PipelineBoard key={selectedPipeline.id} pipeline={selectedPipeline} />
      )}
    </section>
  );
}
