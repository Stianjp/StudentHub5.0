import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { getAdminFeedbackOverview, listAdminFeedbackResponses, type FeedbackResponse } from "@/lib/feedback";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminFeedbackResponsesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const saved = params.saved === "1";
  const errorMessage = typeof params.error === "string" ? params.error : "";
  const error = Boolean(errorMessage) && errorMessage !== "1";

  const [folders, responses] = await Promise.all([getAdminFeedbackOverview(), listAdminFeedbackResponses()]);
  const totalResponses = responses.length;

  const groupedResponses = new Map<string, FeedbackResponse[]>();
  for (const response of responses) {
    const current = groupedResponses.get(response.form_id) ?? [];
    current.push(response);
    groupedResponses.set(response.form_id, current);
  }

  const rows = folders.flatMap((folder) =>
    folder.forms.map((form) => ({
      folder,
      form,
      items: groupedResponses.get(form.id) ?? [],
    })),
  );

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Skjemaer"
        title="Svaroversikt"
        description="Samlet oversikt over innsendelser fra alle skjemaer og arrangementmapper."
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

      <Card className="bg-primary text-surface">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-surface/60">Totalt</p>
            <p className="mt-2 text-3xl font-black">{totalResponses} svar</p>
          </div>
          <Link href="/admin/forms" className="button-link text-sm">
            Tilbake til skjemabygger
          </Link>
        </div>
      </Card>

      {rows.length === 0 ? (
        <Card className="text-sm text-primary/70">Ingen innsendelser er mottatt ennå.</Card>
      ) : (
        <div className="grid gap-4">
          {rows.map(({ folder, form, items }) => (
            <Card key={form.id} className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-primary">{form.title}</h3>
                    <Badge variant={form.is_published ? "success" : "warning"}>
                      {form.is_published ? "Publisert" : "Utkast"}
                    </Badge>
                  </div>
                  <p className="text-sm text-primary/70">{folder.name}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/admin/forms/${form.id}#svar`} className="button-link text-sm">
                    Se svar
                  </Link>
                  <Link href={`/admin/forms/${form.id}/export`} className="button-link text-sm">
                    CSV
                  </Link>
                  <Link href={`/admin/forms/${form.id}`} className="button-link text-sm">
                    Rediger
                  </Link>
                  <Link href={`/feedback/${folder.slug}/${form.slug}`} className="button-link text-sm">
                    Offentlig side
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Card className="bg-[#FBF8F4] p-4 shadow-none">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/50">Svar</p>
                  <p className="mt-1 text-2xl font-black text-primary">{items.length}</p>
                </Card>
                <Card className="bg-[#FBF8F4] p-4 shadow-none">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/50">Spørsmål</p>
                  <p className="mt-1 text-2xl font-black text-primary">{form.questionCount}</p>
                </Card>
                <Card className="bg-[#FBF8F4] p-4 shadow-none">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/50">Siste svar</p>
                  <p className="mt-1 text-sm font-semibold text-primary">
                    {items[0] ? new Date(items[0].submitted_at).toLocaleString("nb-NO") : "Ingen"}
                  </p>
                </Card>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
