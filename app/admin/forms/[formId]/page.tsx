import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Textarea } from "@/components/ui/textarea";
import { getAdminFeedbackForm, getAdminFeedbackSlugSuggestionGroups, questionOptions } from "@/lib/feedback";
import { buildFeedbackQuestionSummaries, formatFeedbackAnswer } from "@/lib/feedback-report";
import {
  createFeedbackQuestionAction,
  deleteFeedbackFormAction,
  saveFeedbackFormAction,
} from "@/app/admin/forms/actions";
import { SlugPicker } from "@/components/admin/slug-picker";
import { QuestionCreateForm } from "@/components/admin/question-create-form";
import { DeleteFeedbackForm } from "@/components/admin/delete-feedback-form";

type PageProps = {
  params: Promise<{ formId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { formId } = await params;
  const result = await getAdminFeedbackForm(formId);

  if (!result) {
    return {
      title: "Skjemaer | Oslo Student Hub",
    };
  }

  return {
    title: `${result.form.title} | Skjemaer | Oslo Student Hub`,
    description: result.form.description ?? "Rediger skjema og se svar.",
  };
}

export default async function AdminFeedbackFormPage({ params, searchParams }: PageProps) {
  const { formId } = await params;
  const query = await searchParams;
  const saved = query.saved === "1";
  const errorMessage = typeof query.error === "string" ? query.error : "";
  const error = Boolean(errorMessage) && errorMessage !== "1";
  const [result, slugGroups] = await Promise.all([
    getAdminFeedbackForm(formId),
    getAdminFeedbackSlugSuggestionGroups(),
  ]);

  if (!result) {
    notFound();
  }

  const { folder, form, questions, responses } = result;
  const questionSummaries = buildFeedbackQuestionSummaries(questions, responses);
  const publicUrl = `/feedback/${folder.slug}/${form.slug}`;

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/admin/forms"
        className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-primary/70 transition hover:text-primary"
      >
        <ArrowLeft size={16} />
        Tilbake til oversikt
      </Link>

      <SectionHeader
        eyebrow="Skjemaer"
        title={form.title}
        description={`Mappen ${folder.name}. Offentlig lenke: ${publicUrl}`}
        actions={
          <Link href={publicUrl} className="button-link text-sm">
            <ExternalLink size={14} className="mr-2" />
            Åpne offentlig
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        <a
          href="#innstillinger"
          className="inline-flex min-h-10 items-center justify-center rounded-full bg-secondary px-4 py-2 text-sm font-bold text-primary transition hover:-translate-y-0.5 hover:bg-secondary/80"
        >
          Skjemainnstillinger
        </a>
        <a
          href="#sporsmal"
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-primary/10 bg-white px-4 py-2 text-sm font-bold text-primary transition hover:-translate-y-0.5 hover:bg-[#FBF8F4]"
        >
          Spørsmål
        </a>
        <a
          href="#svar"
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-primary/10 bg-white px-4 py-2 text-sm font-bold text-primary transition hover:-translate-y-0.5 hover:bg-[#FBF8F4]"
        >
          Svar
        </a>
      </div>

      {saved ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">
          Oppdatering lagret.
        </Card>
      ) : null}
      {error ? (
        <Card className="border border-error/30 bg-error/10 text-sm text-error">
          {errorMessage ? decodeURIComponent(errorMessage) : "Kunne ikke lagre. Sjekk feltene og prøv igjen."}
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary text-surface">
          <p className="text-xs font-semibold uppercase tracking-wide text-surface/60">Spørsmål</p>
          <p className="mt-2 text-3xl font-black">{questions.length}</p>
        </Card>
        <Card className="bg-primary text-surface">
          <p className="text-xs font-semibold uppercase tracking-wide text-surface/60">Svar</p>
          <p className="mt-2 text-3xl font-black">{responses.length}</p>
        </Card>
        <Card className="bg-primary text-surface">
          <p className="text-xs font-semibold uppercase tracking-wide text-surface/60">Status</p>
          <p className="mt-2 text-3xl font-black">{form.is_published ? "Publisert" : "Utkast"}</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card id="innstillinger" className="admin-light-surface scroll-mt-24 flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-bold text-primary">Skjemainnstillinger</h3>
            <p className="text-sm text-primary/70">
              Oppdater tittel, slug, beskrivelse og publiseringsstatus.
            </p>
          </div>
          <form action={saveFeedbackFormAction} className="grid gap-3">
            <input type="hidden" name="returnTo" value={`/admin/forms/${formId}`} />
            <input type="hidden" name="formId" value={form.id} />
            <input type="hidden" name="folderId" value={folder.id} />
            <p className="text-sm font-semibold text-primary">
              Mappe
              <span className="ml-2 font-normal text-primary/70">{folder.name}</span>
            </p>
            <label className="text-sm font-semibold text-primary">
              Tittel
              <Input name="title" required defaultValue={form.title} />
            </label>
            <SlugPicker
              name="slug"
              label="Slug"
              groups={slugGroups}
              defaultValue={form.slug}
              placeholder="hva-synes-du-om-arrangementet"
              helpText="Velg en eksisterende slug eller legg til ny nederst i menyen."
            />
            <label className="text-sm font-semibold text-primary">
              Beskrivelse
              <Textarea name="description" rows={3} defaultValue={form.description ?? ""} />
            </label>
            <label className="text-sm font-semibold text-primary">
              Introtekst
              <Textarea name="introText" rows={4} defaultValue={form.intro_text ?? ""} />
            </label>
            <label className="text-sm font-semibold text-primary">
              CTA-tekst
              <Input name="ctaLabel" defaultValue={form.cta_label} />
            </label>
            <label className="text-sm font-semibold text-primary">
              Takk-tekst
              <Textarea name="thankYouText" rows={3} defaultValue={form.thank_you_text} />
            </label>
            <label className="text-sm font-semibold text-primary">
              Sortering
              <Input name="sortOrder" type="number" defaultValue={form.sort_order} />
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold text-primary">
              <input
                type="checkbox"
                name="isPublished"
                defaultChecked={form.is_published}
                className="size-4 rounded border-primary/30 text-secondary"
              />
              Publiser skjemaet
            </label>
            <p className="text-xs text-primary/60">
              Fjern avkrysningen og lagre for å gjøre skjemaet upublisert.
            </p>
            <Button type="submit">Lagre skjema</Button>
          </form>
        </Card>

        <QuestionCreateForm
          action={createFeedbackQuestionAction}
          formId={form.id}
          returnTo={`/admin/forms/${formId}`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card id="sporsmal" className="admin-light-surface scroll-mt-24 flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-bold text-primary">Spørsmål</h3>
            <p className="text-sm text-primary/70">Rekkefølgen følger sortering og opprettelsestid.</p>
          </div>
          {questions.length === 0 ? (
            <p className="text-sm text-primary/70">Ingen spørsmål er lagt til ennå.</p>
          ) : (
            <div className="grid gap-3">
              {questions.map((question) => (
                <div
                  key={question.id}
                  className="rounded-2xl border border-primary/10 bg-[#FBF8F4] p-4 text-primary"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-primary">{question.label}</p>
                    <Badge variant="default">{question.kind}</Badge>
                    {question.required ? <Badge variant="warning">Påkrevd</Badge> : null}
                  </div>
                  {question.help_text ? <p className="mt-1 text-sm text-primary/65">{question.help_text}</p> : null}
                  {questionOptions(question).length > 0 ? (
                    <p className="mt-2 text-xs text-primary/55">
                      Alternativer: {questionOptions(question).join(", ")}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card id="svar" className="admin-light-surface scroll-mt-24 flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-bold text-primary">Svaroversikt</h3>
              <p className="text-sm text-primary/70">
                Se hvor mange som har svart på hvert spørsmål, og hvordan svarene fordeler seg.
              </p>
            </div>
            <Link
              href={`/admin/forms/${form.id}/export`}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-secondary px-5 py-3 text-sm font-bold text-primary transition hover:-translate-y-0.5 hover:bg-secondary/80"
            >
              Last ned CSV
            </Link>
          </div>

          {responses.length === 0 ? (
            <p className="text-sm text-primary/70">Ingen svar er mottatt ennå.</p>
          ) : (
            <div className="grid gap-3">
              {questionSummaries.map((summary) => {
                const { question } = summary;
                const hasCounts = summary.counts.length > 0;

                return (
                  <div
                    key={question.id}
                    className="rounded-2xl border border-primary/10 bg-[#FBF8F4] p-4 text-primary"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-primary">{question.label}</p>
                      <Badge variant="default">{question.kind}</Badge>
                      {question.required ? <Badge variant="warning">Påkrevd</Badge> : null}
                    </div>
                    {question.help_text ? <p className="mt-1 text-sm text-primary/65">{question.help_text}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-primary/5 px-3 py-1 font-semibold text-primary/70">
                        Besvart {summary.answeredCount} / {summary.totalCount}
                      </span>
                      {summary.missingCount > 0 ? (
                        <span className="rounded-full bg-error/10 px-3 py-1 font-semibold text-error">
                          Mangler {summary.missingCount}
                        </span>
                      ) : null}
                      {summary.average !== null ? (
                        <span className="rounded-full bg-secondary/20 px-3 py-1 font-semibold text-primary">
                          Snitt {summary.average.toFixed(1)}
                        </span>
                      ) : null}
                    </div>
                    {hasCounts ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {summary.counts.map((count) => (
                          <span
                            key={`${question.id}-${count.label}`}
                            className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-primary shadow-none ring-1 ring-primary/10"
                          >
                            <span>{count.label}</span>
                            <span className="rounded-full bg-primary/5 px-2 py-0.5 text-primary">
                              {count.count}
                            </span>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {!hasCounts && summary.examples.length > 0 ? (
                      <p className="mt-3 text-sm text-primary/70">
                        Eksempler: {summary.examples.join(" · ")}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="admin-light-surface flex flex-col gap-4 xl:col-span-2">
          <div>
            <h3 className="text-lg font-bold text-primary">Enkeltbesvarelser</h3>
            <p className="text-sm text-primary/70">Trykk på hver besvarelse for å se svarene én og én.</p>
          </div>
          {responses.length === 0 ? (
            <p className="text-sm text-primary/70">Ingen svar er mottatt ennå.</p>
          ) : (
            <div className="grid gap-4">
              {responses.map((response, index) => {
                const answerMap = response.answers as Record<string, unknown>;

                return (
                  <details
                    key={response.id}
                    className="group rounded-2xl border border-primary/10 bg-[#FBF8F4] p-4 text-primary"
                    open={index === 0}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-primary">
                          {new Date(response.submitted_at).toLocaleString("nb-NO")}
                        </p>
                        <p className="text-xs text-primary/60">Klikk for å åpne svarene</p>
                      </div>
                      <Badge variant="info">Svar {responses.length - index}</Badge>
                    </summary>
                    <div className="mt-4 grid gap-3">
                      {questions.map((question) => (
                        <div key={question.id} className="rounded-2xl bg-white p-3 text-primary">
                          <p className="text-xs font-semibold uppercase tracking-wide text-primary/50">
                            {question.label}
                          </p>
                          <p className="mt-1 text-sm text-primary">{formatFeedbackAnswer(answerMap[question.id])}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card className="admin-light-surface flex flex-col gap-4 border border-error/20 bg-white">
        <div>
          <h3 className="text-lg font-bold text-primary">Fjern skjema</h3>
          <p className="text-sm text-primary/70">
            Sletting fjerner skjemaet permanent sammen med spørsmål og svar.
          </p>
        </div>
        <DeleteFeedbackForm action={deleteFeedbackFormAction} formId={form.id} returnTo="/admin/forms" title={form.title} />
      </Card>
    </div>
  );
}
