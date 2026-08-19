"use client";

import { useState } from "react";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CrmPipelineBoard } from "@/lib/crm-pipelines";
import {
  addCustomCrmPipelineStage,
  createCustomCrmPipeline,
  deleteCustomCrmPipeline,
  deleteCustomCrmPipelineStage,
  moveCustomCrmPipelineCompany,
  renameCustomCrmPipeline,
  renameCustomCrmPipelineStage,
} from "@/app/admin/crm/actions";

type CrmPipelineManagerProps = {
  pipelines: CrmPipelineBoard[];
};

function PipelineBoard({ pipeline }: { pipeline: CrmPipelineBoard }) {
  return (
    <Card id={`pipeline-${pipeline.id}`} className="flex scroll-mt-24 flex-col gap-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">
            {pipeline.is_default ? "Standardpipeline" : "Egen pipeline"}
          </p>
          <h2 className="text-xl font-bold text-primary">{pipeline.name}</h2>
          <p className="text-sm text-ink/70">
            {pipeline.is_default
              ? "Synkroniseres med betalings- og kontraktstatus i resten av CRM-systemet."
              : "Hver bedrift kan flyttes uavhengig av de andre pipelinebrettene."}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 xl:max-w-xl">
          <form action={renameCustomCrmPipeline} className="flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="pipelineId" value={pipeline.id} />
            <Input name="name" defaultValue={pipeline.name} aria-label="Pipelinenavn" required maxLength={120} />
            <Button type="submit" variant="secondary" className="shrink-0">
              Endre navn
            </Button>
          </form>
          {!pipeline.is_default ? (
            <ConfirmActionForm
              action={deleteCustomCrmPipeline}
              fields={{ pipelineId: pipeline.id }}
              label="Slett pipeline"
              confirmMessage={`Slette pipelinen «${pipeline.name}»? Alle lagrede plasseringer i denne pipelinen slettes.`}
              className="self-start sm:self-end"
            />
          ) : null}
        </div>
      </div>

      {!pipeline.is_default ? (
        <details className="rounded-2xl border border-white/15 bg-primary/5 p-4">
          <summary className="cursor-pointer text-sm font-bold text-primary">Administrer kolonner</summary>
          <div className="mt-4 grid gap-3">
            {pipeline.stages.map((stage) => (
              <div key={stage.id} className="flex flex-col gap-2 rounded-xl border border-white/15 p-3 md:flex-row md:items-center">
                <form action={renameCustomCrmPipelineStage} className="flex flex-1 flex-col gap-2 sm:flex-row">
                  <input type="hidden" name="stageId" value={stage.id} />
                  <Input name="name" defaultValue={stage.name} aria-label={`Navn på kolonnen ${stage.name}`} required maxLength={80} />
                  <Button type="submit" variant="secondary" className="shrink-0 rounded-xl px-4 py-2 text-xs">
                    Endre
                  </Button>
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

            <form action={addCustomCrmPipelineStage} className="flex flex-col gap-2 border-t border-white/15 pt-4 sm:flex-row">
              <input type="hidden" name="pipelineId" value={pipeline.id} />
              <Input name="name" placeholder="Navn på ny kolonne" aria-label="Navn på ny kolonne" required maxLength={80} />
              <Button type="submit" variant="secondary" className="shrink-0">
                Legg til kolonne
              </Button>
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
            <section key={stage.id} className="flex min-h-[18rem] flex-col rounded-2xl border border-white/15 bg-primary/5 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-primary">{stage.name}</h3>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-primary">
                  {stage.companies.length}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-3">
                {stage.companies.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/15 p-4 text-xs text-ink/70">
                    Ingen bedrifter i denne kolonnen.
                  </p>
                ) : (
                  stage.companies.map((company) => (
                    <article key={company.key} className="rounded-2xl border border-white/15 bg-[#1B0858] p-4">
                      <h4 className="text-sm font-bold text-primary">{company.company}</h4>
                      <p className="text-xs text-ink/70">{company.eventName || "Uten event"}</p>
                      {company.totalContacts > 0 ? (
                        <p className="mt-2 text-xs text-ink/70">
                          {company.totalContacts} kontakt{company.totalContacts === 1 ? "" : "er"} · {company.openLeadCount} åpne
                        </p>
                      ) : null}

                      <form action={moveCustomCrmPipelineCompany} className="mt-3 flex flex-col gap-2">
                        <input type="hidden" name="pipelineId" value={pipeline.id} />
                        <input type="hidden" name="companyKey" value={company.key} />
                        <input type="hidden" name="companyId" value={company.companyId ?? ""} />
                        <input type="hidden" name="eventId" value={company.eventId ?? ""} />
                        <input type="hidden" name="company" value={company.company} />
                        <input type="hidden" name="eventName" value={company.eventName} />
                        <Select name="stageId" defaultValue={stage.id} aria-label={`Flytt ${company.company}`}>
                          {pipeline.stages.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </Select>
                        <Button type="submit" variant="secondary" className="rounded-xl px-4 py-2 text-xs">
                          Flytt bedrift
                        </Button>
                      </form>
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

export function CrmPipelineManager({ pipelines }: CrmPipelineManagerProps) {
  const [selectedPipelineId, setSelectedPipelineId] = useState(pipelines[0]?.id ?? "");
  const selectedPipeline =
    pipelines.find((pipeline) => pipeline.id === selectedPipelineId) ?? pipelines[0];

  return (
    <section className="flex flex-col gap-5" aria-labelledby="crm-pipelines-heading">
      <Card className="flex flex-col gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Pipelinebygger</p>
          <h2 id="crm-pipelines-heading" className="text-xl font-bold text-primary">Administrer pipelines</h2>
          <p className="text-sm text-ink/70">
            Nye pipelines får alle deltakende bedrifter i første kolonne. Plasseringene er uavhengige mellom pipelinebrettene.
          </p>
        </div>

        {pipelines.length > 0 ? (
          <label className="max-w-xl text-sm font-semibold text-primary">
            Pipeline som skal vises
            <Select
              value={selectedPipeline?.id ?? ""}
              onChange={(event) => setSelectedPipelineId(event.target.value)}
              aria-label="Velg pipeline som skal vises"
            >
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </Select>
          </label>
        ) : null}

        <details className="rounded-2xl border border-white/15 bg-primary/5 p-4">
          <summary className="cursor-pointer text-sm font-bold text-primary">Lag ny pipeline</summary>
          <form action={createCustomCrmPipeline} className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] xl:items-end">
            <label className="text-sm font-semibold text-primary">
              Navn på pipeline
              <Input name="name" placeholder="For eksempel Pipeline 3" required maxLength={120} />
            </label>
            <label className="text-sm font-semibold text-primary">
              Kolonner, én per linje
              <Textarea
                name="stageNames"
                defaultValue={"Bedrift\nPågår\nFerdig"}
                required
                rows={4}
                className="min-h-28"
              />
            </label>
            <Button type="submit" variant="secondary" className="xl:mb-1">
              Opprett pipeline
            </Button>
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
