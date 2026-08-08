import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleHelp, Mail, MessageSquareText, Star, Type } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FEEDBACK_QUESTION_KINDS,
  type FeedbackQuestion,
  getPublicFeedbackForm,
  questionOptions,
} from "@/lib/feedback";
import { submitFeedbackForm } from "@/app/feedback/actions";

type PageProps = {
  params: Promise<{ folderSlug: string; formSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { folderSlug, formSlug } = await params;
  const result = await getPublicFeedbackForm(folderSlug, formSlug);

  if (!result) {
    return {
      title: "Feedback | Oslo Student Hub",
    };
  }

  return {
    title: `${result.form.title} | Feedback | Oslo Student Hub`,
    description: result.form.description ?? "Tilbakemeldingsskjema for Oslo Student Hub.",
  };
}

function questionIcon(kind: (typeof FEEDBACK_QUESTION_KINDS)[number]) {
  if (kind === "rating") return Star;
  if (kind === "email") return Mail;
  if (kind === "long_text") return MessageSquareText;
  if (kind === "short_text" || kind === "number") return Type;
  return CircleHelp;
}

function renderQuestionField(question: FeedbackQuestion) {
  const options = questionOptions(question);
  const Icon = questionIcon(question.kind);

  return (
    <fieldset key={question.id} className="rounded-3xl border border-primary/10 bg-[#FBF8F4] p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary text-surface">
          <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <label className="block text-base font-bold text-primary" htmlFor={question.id}>
            {question.label}
            {question.required ? <span className="ml-1 text-error">*</span> : null}
          </label>
          {question.help_text ? (
            <p className="mt-1 text-sm leading-6 text-primary/65">{question.help_text}</p>
          ) : null}
          <div className="mt-4">
            {question.kind === "short_text" ? (
              <Input id={question.id} name={question.id} required={question.required} />
            ) : null}
            {question.kind === "email" ? (
              <Input id={question.id} name={question.id} type="email" required={question.required} />
            ) : null}
            {question.kind === "number" ? (
              <Input id={question.id} name={question.id} type="number" inputMode="numeric" required={question.required} />
            ) : null}
            {question.kind === "long_text" ? (
              <Textarea id={question.id} name={question.id} rows={5} required={question.required} />
            ) : null}
            {question.kind === "rating" ? (
              <Select id={question.id} name={question.id} required={question.required} defaultValue="">
                <option value="" disabled>
                  Velg en vurdering
                </option>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating} / 5
                  </option>
                ))}
              </Select>
            ) : null}
            {question.kind === "yes_no" ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                {[
                  { value: "yes", label: "Ja" },
                  { value: "no", label: "Nei" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex flex-1 items-center gap-3 rounded-2xl border border-primary/10 bg-surface px-4 py-3 text-sm font-semibold text-primary"
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={option.value}
                      required={question.required}
                      className="size-4 border-primary/30 text-secondary focus:ring-secondary"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            ) : null}
            {question.kind === "single_choice" ? (
              options.length > 0 ? (
                <div className="grid gap-2">
                  {options.map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-3 rounded-2xl border border-primary/10 bg-surface px-4 py-3 text-sm font-medium text-primary"
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option}
                        required={question.required}
                        className="size-4 border-primary/30 text-secondary focus:ring-secondary"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-primary/60">Ingen alternativer er lagt inn ennå.</p>
              )
            ) : null}
            {question.kind === "multi_choice" ? (
              options.length > 0 ? (
                <div className="grid gap-2">
                  {options.map((option) => (
                    <label key={option} className="flex items-center gap-3 rounded-2xl border border-primary/10 bg-white px-4 py-3 text-sm font-medium text-primary">
                      <input
                        type="checkbox"
                        name={question.id}
                        value={option}
                        className="size-4 rounded border-primary/30 text-secondary focus:ring-secondary"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-primary/60">Ingen alternativer er lagt inn ennå.</p>
              )
            ) : null}
          </div>
        </div>
      </div>
    </fieldset>
  );
}

export default async function FeedbackFormPage({ params, searchParams }: PageProps) {
  const { folderSlug, formSlug } = await params;
  const query = await searchParams;
  const submitted = query.submitted === "1";
  const error = typeof query.error === "string" ? decodeURIComponent(query.error) : "";
  const result = await getPublicFeedbackForm(folderSlug, formSlug);

  if (!result) {
    notFound();
  }

  const { folder, form, questions } = result;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f7f2ec_0%,_#fffaf4_100%)] text-primary">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
        <Link href={`/feedback/${folder.slug}`} className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-primary/70 transition hover:text-primary">
          <ArrowLeft size={16} />
          Tilbake til {folder.name}
        </Link>

        <Card className="bg-[#140249] text-surface">
          <div className="flex flex-col gap-4">
            <Badge variant="info" className="w-fit bg-white/10 text-white">
              {folder.name}
            </Badge>
            <div className="max-w-3xl">
              <h1 className="text-3xl font-black md:text-5xl">{form.title}</h1>
              {form.description ? (
                <p className="mt-3 text-sm leading-6 text-white/80 md:text-base">
                  {form.description}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-white/70">
              <span>{questions.length} spørsmål</span>
              <span>•</span>
              <span>Fast QR-landing</span>
              {form.can_share_answers_with_partners ? (
                <>
                  <span>•</span>
                  <span>Svar kan deles med samarbeidspartnere</span>
                </>
              ) : null}
            </div>
          </div>
        </Card>

        {submitted ? (
          <Card className="border border-success/20 bg-success/10 text-success">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className="mt-0.5" />
              <div>
                <p className="font-bold">Takk for tilbakemeldingen</p>
                <p className="mt-1 text-sm text-success/80">{form.thank_you_text}</p>
              </div>
            </div>
          </Card>
        ) : null}

        {error ? (
          <Card className="border border-error/20 bg-error/10 text-error">
            <p className="text-sm font-semibold">{error}</p>
          </Card>
        ) : null}

        {!submitted ? (
          <form action={submitFeedbackForm} className="flex flex-col gap-5">
            <input type="hidden" name="folderSlug" value={folder.slug} />
            <input type="hidden" name="formSlug" value={form.slug} />
            <input type="hidden" name="formId" value={form.id} />

            {form.intro_text ? (
              <Card className="border border-primary/10 bg-white text-sm leading-7 text-primary/75">
                {form.intro_text}
              </Card>
            ) : null}

            {questions.length === 0 ? (
              <Card className="text-sm text-primary/70">
                Dette skjemaet har ingen spørsmål ennå. Legg til spørsmål før skjemaet brukes.
              </Card>
            ) : questions.map((question) => renderQuestionField(question))}

            <Card className="border border-primary/10 bg-white text-sm leading-6 text-primary/75">
              <label className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-[#FBF8F4] p-4 font-semibold text-primary">
                <input
                  type="checkbox"
                  name="shareConsent"
                  required
                  className="mt-1 size-4 rounded border-primary/30 text-secondary focus:ring-secondary"
                />
                Jeg samtykker til at svarene kan deles med samarbeidende bedrifter i henhold til personvernreglene.
              </label>
              <p className="mt-3 text-xs text-primary/55">
                Samtykket må gis før skjemaet kan sendes inn.
              </p>
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-primary/55">
                Svarene lagres anonymt eller med nødvendig metadata for skjemaet.
              </p>
              <Button type="submit" className="sm:self-end">
                {form.cta_label}
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </main>
  );
}
