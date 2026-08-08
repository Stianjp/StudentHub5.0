import Link from "next/link";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import {
  getAdminFeedbackOverview,
  getAdminFeedbackSlugSuggestionGroups,
} from "@/lib/feedback";
import { createFeedbackFormWizardAction } from "@/app/admin/forms/actions";
import { FeedbackFormBuilder } from "./form-builder";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Lag skjema | Oslo Student Hub",
  description: "Opprett et nytt feedback-skjema med spørsmål, svarvalg og enkel struktur.",
};

export default async function NewFeedbackFormPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const errorMessage = typeof params.error === "string" ? params.error : "";
  const error = Boolean(errorMessage) && errorMessage !== "1";

  const [folders, slugGroups] = await Promise.all([
    getAdminFeedbackOverview(),
    getAdminFeedbackSlugSuggestionGroups(),
  ]);
  const folderChoices = folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    slug: folder.slug,
    description: folder.description,
  }));

  return (
    <div className="flex flex-col gap-8 text-primary">
      <SectionHeader
        eyebrow="Skjemaer"
        title="Lag nytt skjema"
        description="Bygg skjemaet i en egen side med tydelig struktur for tittel, spørsmål og svarvalg."
      />

      <div className="flex items-center justify-between gap-3">
        <Link href="/admin/forms" className="button-link text-sm">
          Tilbake til oversikt
        </Link>
      </div>

      {error ? (
        <Card className="border border-error/30 bg-error/10 text-sm text-error">
          {errorMessage ? decodeURIComponent(errorMessage) : "Kunne ikke lagre. Sjekk feltene og prøv igjen."}
        </Card>
      ) : null}

      {folderChoices.length === 0 ? (
        <Card className="text-sm text-primary/70">
          Du må opprette en arrangementmappe før du kan lage et skjema. Gå tilbake til oversikten og lag en mappe først.
        </Card>
      ) : (
        <FeedbackFormBuilder
          folders={folderChoices}
          slugGroups={slugGroups}
          action={createFeedbackFormWizardAction}
        />
      )}
    </div>
  );
}
