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

function formatAnswer(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (value === true) return "Ja";
  if (value === false) return "Nei";
  if (value === null || value === undefined || value === "") return "Ingen verdi";
  return String(value);
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
  const publicUrl = `/feedback/${folder.slug}/${form.slug}`;

  return (
    <div className="flex flex-col gap-8">
      <Link href="/admin/forms" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-primary/70 transition hover:text-primary">
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
        <Card className="admin-light-surface flex flex-col gap-4">
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
              <input type="checkbox" name="isPublished" defaultChecked={form.is_published} className="size-4 rounded border-primary/30 text-secondary" />
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

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <Card className="admin-light-surface flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-primary">Spørsmål</h3>
              <p className="text-sm text-primary/70">Rekkefølgen følger sortering og opprettelsestid.</p>
            </div>
          </div>
          {questions.length === 0 ? (
            <p className="text-sm text-primary/70">Ingen spørsmål er lagt til ennå.</p>
          ) : (
            <div className="grid gap-3">
              {questions.map((question) => (
                <div key={question.id} className="rounded-2xl border border-primary/10 bg-[#FBF8F4] p-4 text-primary">
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

        <Card className="admin-light-surface flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-bold text-primary">Svar</h3>
            <p className="text-sm text-primary/70">Viser siste innsendelser for skjemaet.</p>
          </div>
          {responses.length === 0 ? (
            <p className="text-sm text-primary/70">Ingen svar er mottatt ennå.</p>
          ) : (
            <div className="grid gap-4">
              {responses.map((response) => {
                const answerMap = response.answers as Record<string, unknown>;

                return (
                  <div key={response.id} className="rounded-2xl border border-primary/10 bg-[#FBF8F4] p-4 text-primary">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-primary">
                        {new Date(response.submitted_at).toLocaleString("nb-NO")}
                      </p>
                      <Badge variant="info">Svar</Badge>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {questions.map((question) => (
                        <div key={question.id} className="rounded-2xl bg-white p-3 text-primary">
                          <p className="text-xs font-semibold uppercase tracking-wide text-primary/50">
                            {question.label}
                          </p>
                          <p className="mt-1 text-sm text-primary">{formatAnswer(answerMap[question.id])}</p>
                        </div>
                      ))}
                    </div>
                  </div>
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
        <DeleteFeedbackForm
          action={deleteFeedbackFormAction}
          formId={form.id}
          returnTo="/admin/forms"
          title={form.title}
        />
      </Card>
    </div>
  );
}
