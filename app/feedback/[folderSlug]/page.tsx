import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { getPublicFeedbackFolder } from "@/lib/feedback";

type PageProps = {
  params: Promise<{ folderSlug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { folderSlug } = await params;
  const result = await getPublicFeedbackFolder(folderSlug);

  if (!result?.folder) {
    return {
      title: "Feedback | Oslo Student Hub",
    };
  }

  return {
    title: `${result.folder.name} | Feedback | Oslo Student Hub`,
    description: result.folder.description ?? "Feedback og undersøkelser for Oslo Student Hub.",
  };
}

export default async function FeedbackFolderPage({ params }: PageProps) {
  const { folderSlug } = await params;
  const result = await getPublicFeedbackFolder(folderSlug);

  if (!result?.folder) {
    notFound();
  }

  const { folder, forms } = result;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f7f2ec_0%,_#fffaf4_100%)] text-primary">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
        <Link href="/feedback" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-primary/70 transition hover:text-primary">
          <ArrowLeft size={16} />
          Tilbake til oversikt
        </Link>

        <Card className="bg-[#140249] text-surface">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <Badge variant="info" className="mb-4 bg-white/10 text-white">
                <FolderOpen size={14} className="mr-2" />
                Arrangementmappe
              </Badge>
              <h1 className="text-3xl font-black md:text-5xl">{folder.name}</h1>
              {folder.description ? (
                <p className="mt-3 text-sm leading-6 text-white/80 md:text-base">
                  {folder.description}
                </p>
              ) : null}
            </div>
            <Badge variant="default" className="w-fit bg-white/10 text-white">
              {forms.length} skjemaer
            </Badge>
          </div>
        </Card>

        <SectionHeader
          eyebrow="Skjemaer"
          title="Velg skjema"
          description="Her ligger skjemaene som er tilknyttet arrangementet."
        />

        <div className="grid gap-4">
          {forms.length === 0 ? (
            <Card className="text-sm text-primary/70">
              Det ligger ingen publiserte skjemaer i denne mappen ennå.
            </Card>
          ) : (
            forms.map((form) => (
              <Link
                key={form.id}
                href={`/feedback/${folder.slug}/${form.slug}`}
                className="group flex min-h-20 w-full items-center justify-between rounded-3xl border border-primary/10 bg-white px-4 py-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-secondary/60 hover:shadow-lg sm:px-6"
              >
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-primary sm:text-2xl">{form.title}</h2>
                  {form.description ? (
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-primary/70">
                      {form.description}
                    </p>
                  ) : null}
                </div>
                <div className="ml-4 flex shrink-0 flex-col items-end gap-2">
                  <Badge variant="success">{form.cta_label}</Badge>
                  <span className="text-xs text-primary/55">{form.questionCount} spørsmål</span>
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
                    Åpne
                    <ArrowRight size={14} className="transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
