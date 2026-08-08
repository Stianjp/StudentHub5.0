import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createFeedbackFolderAction } from "@/app/admin/forms/actions";
import { getAdminFeedbackOverview } from "@/lib/feedback";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminFormsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const saved = params.saved === "1";
  const errorMessage = typeof params.error === "string" ? params.error : "";
  const error = Boolean(errorMessage) && errorMessage !== "1";

  const folders = await getAdminFeedbackOverview();
  const totalForms = folders.reduce((sum, folder) => sum + folder.forms.length, 0);
  const totalQuestions = folders.reduce((sum, folder) => sum + folder.forms.reduce((count, form) => count + form.questionCount, 0), 0);
  const totalResponses = folders.reduce((sum, folder) => sum + folder.responseCount, 0);

  return (
    <div className="flex flex-col gap-8 text-primary">
      <SectionHeader
        eyebrow="Skjemaer"
        title="Skjemabygger for feedback"
        description="Lag mapper per arrangement, opprett flere skjemaer per mappe, og bruk en fast QR-kode til feedback.oslostudenthub.no."
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

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-primary text-surface">
          <p className="text-xs font-semibold uppercase tracking-wide text-surface/60">Mapper</p>
          <p className="mt-2 text-3xl font-black">{folders.length}</p>
        </Card>
        <Card className="bg-primary text-surface">
          <p className="text-xs font-semibold uppercase tracking-wide text-surface/60">Skjemaer</p>
          <p className="mt-2 text-3xl font-black">{totalForms}</p>
        </Card>
        <Card className="bg-primary text-surface">
          <p className="text-xs font-semibold uppercase tracking-wide text-surface/60">Spørsmål</p>
          <p className="mt-2 text-3xl font-black">{totalQuestions}</p>
        </Card>
        <Card className="bg-primary text-surface">
          <p className="text-xs font-semibold uppercase tracking-wide text-surface/60">Svar</p>
          <p className="mt-2 text-3xl font-black">{totalResponses}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-bold text-primary">Ny arrangementmappe</h3>
            <p className="text-sm text-primary/70">
              Eksempel: Student Connect 2026. Her samler vi flere skjemaer under samme arrangement.
            </p>
          </div>
          <form action={createFeedbackFolderAction} className="grid gap-3">
            <input type="hidden" name="returnTo" value="/admin/forms" />
            <label className="text-sm font-semibold text-primary">
              Navn
              <Input name="name" required placeholder="Student Connect 2026" />
            </label>
            <label className="text-sm font-semibold text-primary">
              Slug
              <Input name="slug" placeholder="student-connect-2026" />
            </label>
            <label className="text-sm font-semibold text-primary">
              Beskrivelse
              <Textarea name="description" rows={4} placeholder="Kort beskrivelse av arrangementet." />
            </label>
            <label className="text-sm font-semibold text-primary">
              Sortering
              <Input name="sortOrder" type="number" defaultValue={0} />
            </label>
            <Button type="submit">Opprett mappe</Button>
          </form>
        </Card>

        <Card className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-bold text-primary">Lag skjema i ny side</h3>
            <p className="text-sm text-primary/70">
              Opprett skjemaet i en egen, tydelig builder med spørsmålstyper, flere spørsmål og personvernbekreftelse.
            </p>
          </div>
          <Link
            href="/admin/forms/new"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-secondary px-6 py-3 text-sm font-bold text-primary transition hover:-translate-y-0.5 hover:bg-secondary/80"
          >
            Gå til skjemabygger
          </Link>
          <p className="text-sm text-primary/70">
            Du lager fortsatt arrangementmapper her dersom du trenger en ny mappe først.
          </p>
        </Card>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-primary">Arrangementer og skjemaer</h3>
            <p className="text-sm text-primary/70">
              Denne oversikten viser hvordan vi kan ha flere skjemaer per arrangementmappe.
            </p>
          </div>
          <Link href="/admin/forms/responses" className="button-link text-sm">
            Se alle svar
          </Link>
        </div>

        {folders.length === 0 ? (
          <p className="text-sm text-primary/70">Ingen mapper er opprettet ennå.</p>
        ) : (
          <div className="grid gap-4">
            {folders.map((folder) => (
              <div key={folder.id} className="rounded-3xl border border-primary/10 bg-[#FBF8F4] p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xl font-bold text-primary">{folder.name}</h4>
                      <Badge>{folder.forms.length} skjemaer</Badge>
                      <Badge variant="info">{folder.responseCount} svar</Badge>
                    </div>
                    {folder.description ? <p className="mt-2 text-sm text-primary/70">{folder.description}</p> : null}
                  </div>
                  <Link href={`/feedback/${folder.slug}`} className="button-link text-sm">
                    Åpne offentlig side
                  </Link>
                </div>
                <div className="mt-4 grid gap-3">
                  {folder.forms.length === 0 ? (
                    <p className="text-sm text-primary/60">Ingen skjemaer i denne mappen ennå.</p>
                  ) : (
                    folder.forms.map((form) => (
                      <div
                        key={form.id}
                        className="flex flex-col gap-3 rounded-2xl border border-white/70 bg-white p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-primary">{form.title}</p>
                            <Badge variant={form.is_published ? "success" : "warning"}>
                              {form.is_published ? "Publisert" : "Utkast"}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-primary/60">
                            {form.questionCount} spørsmål · {form.responseCount} svar
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/admin/forms/${form.id}`} className="button-link text-sm">
                            Rediger
                          </Link>
                          <Link href={`/feedback/${folder.slug}/${form.slug}`} className="button-link text-sm">
                            Åpen side
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
