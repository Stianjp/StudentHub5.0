import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, QrCode, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { getPublicFeedbackLandingData } from "@/lib/feedback";

export const metadata: Metadata = {
  title: "Feedback | Oslo Student Hub",
  description: "Tilbakemeldinger og undersøkelser for Oslo Student Hub-arrangementer.",
};

export default async function FeedbackLandingPage() {
  const folders = await getPublicFeedbackLandingData();
  const hasForms = folders.some((folder) => folder.forms.length > 0);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(254,154,112,0.18),_transparent_38%),linear-gradient(180deg,_#140249_0%,_#21104f_38%,_#f7f2ec_38%,_#f7f2ec_100%)] text-primary">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
        <Card className="overflow-hidden border border-white/10 bg-[#140249] p-0 text-surface shadow-[0_24px_80px_rgba(20,2,73,0.35)]">
          <div className="grid gap-0 lg:grid-cols-[1.35fr_0.9fr]">
            <div className="relative flex flex-col justify-between gap-8 p-8 md:p-12">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(254,154,112,0.22),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(117,92,255,0.22),_transparent_32%)]" />
              <div className="relative flex flex-col gap-6">
                <Badge variant="info" className="w-fit bg-white/10 text-white">
                  <Sparkles size={14} className="mr-2" />
                  Fast QR-landing for feedback
                </Badge>
                <div className="max-w-2xl space-y-4">
                  <h1 className="text-4xl font-black tracking-tight text-white md:text-6xl">
                    Gi tilbakemelding på eventet
                  </h1>
                  <p className="max-w-xl text-base leading-7 text-white/80 md:text-lg">
                    Denne siden er laget for en fast QR-kode. Her kan vi legge inn
                    korte tilbakemeldingsskjemaer, undersøkelser og event-spesifikke
                    formularer som publikum kan gå videre til.
                  </p>
                </div>
              </div>

              <div className="relative flex flex-col gap-3 sm:flex-row">
                <Link
                  href="#skjemaer"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#FE9A70] px-6 py-3 text-sm font-bold text-[#140249] shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#ffb08e]"
                >
                  Se skjemaene
                </Link>
                <Link
                  href="/admin/forms"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/8 px-6 py-3 text-sm font-bold text-white transition hover:border-[#FE9A70]/60 hover:bg-white/12"
                >
                  Administrer skjemaer
                </Link>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-4 bg-[#F4EEE6] p-8 text-primary md:p-12">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-surface">
                  <QrCode size={22} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/60">
                    Fast adresse
                  </p>
                  <p className="text-lg font-bold">feedback.oslostudenthub.no</p>
                </div>
              </div>
              <p className="text-sm leading-6 text-primary/75">
                Denne adressen kan brukes som permanent mål for QR-koder på plakater,
                skilt og skjermer. Skjemaene og arrangementene styres i admin.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Card className="border border-primary/10 bg-white p-4 shadow-none">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/50">
                    Arrangement
                  </p>
                  <p className="mt-1 text-lg font-bold text-primary">{folders.length}</p>
                </Card>
                <Card className="border border-primary/10 bg-white p-4 shadow-none">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/50">
                    Skjemaer
                  </p>
                  <p className="mt-1 text-lg font-bold text-primary">
                    {folders.reduce((sum, folder) => sum + folder.forms.length, 0)}
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </Card>

        <section id="skjemaer" className="flex flex-col gap-5">
          <SectionHeader
            eyebrow="Skjemaer"
            title="Velg arrangement eller undersøkelse"
            description="Hvert arrangement kan ha flere skjemaer. Bruk denne siden som inngang, og lenk direkte til et skjema når det er fast nok."
          />

          {!hasForms ? (
            <Card className="border border-dashed border-primary/20 bg-white/80 text-sm text-primary/70">
              Ingen publiserte skjemaer ennå. Opprett en mappe og et skjema i{" "}
              <Link href="/admin/forms" className="font-semibold text-primary underline">
                admin
              </Link>
              .
            </Card>
          ) : (
            <div className="grid gap-5">
              {folders.map((folder) => {
                if (folder.forms.length === 0) return null;

                return (
                  <Card key={folder.id} className="bg-white/90">
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-2xl font-black text-primary">{folder.name}</h2>
                            <Badge variant="default">{folder.forms.length} skjemaer</Badge>
                          </div>
                          {folder.description ? (
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-primary/70">
                              {folder.description}
                            </p>
                          ) : null}
                        </div>
                        <Link
                          href={`/feedback/${folder.slug}`}
                          className="inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-secondary px-5 py-3 text-sm font-bold text-primary transition hover:-translate-y-0.5 hover:bg-secondary/80"
                        >
                          Se alle skjemaer
                          <ArrowRight size={16} />
                        </Link>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {folder.forms.map((form) => (
                          <Link
                            key={form.id}
                            href={`/feedback/${folder.slug}/${form.slug}`}
                            className="group rounded-2xl border border-primary/10 bg-[#FBF8F4] p-5 transition hover:-translate-y-0.5 hover:border-secondary/60 hover:bg-white hover:shadow-soft"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-lg font-bold text-primary">{form.title}</p>
                                {form.description ? (
                                  <p className="mt-1 text-sm leading-6 text-primary/70">
                                    {form.description}
                                  </p>
                                ) : null}
                              </div>
                              <Badge variant={form.is_published ? "success" : "warning"}>
                                {form.is_published ? "Publisert" : "Utkast"}
                              </Badge>
                            </div>
                            <div className="mt-4 flex items-center justify-between text-sm text-primary/65">
                              <span>{form.questionCount} spørsmål</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <Card className="bg-primary text-surface">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-surface/70">
                Admin-flyt
              </p>
              <h2 className="mt-1 text-2xl font-black">Skjemaer bygges i admin</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-surface/80">
                Lag mapper for hvert arrangement, opprett ett eller flere skjemaer per
                mappe, og se svarene samlet under Skjemaer i admin.
              </p>
            </div>
            <Link
              href="/admin/forms"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#FE9A70] px-6 py-3 text-sm font-bold text-[#140249] transition hover:-translate-y-0.5 hover:bg-[#ffb08e]"
            >
              Gå til skjemabygger
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
