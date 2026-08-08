import Link from "next/link";
import Image from "next/image";
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

  const formsByFolder = folders.filter((folder) => folder.forms.length > 0);
  const totalForms = formsByFolder.reduce((sum, folder) => sum + folder.forms.length, 0);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(254,154,112,0.18),_transparent_38%),linear-gradient(180deg,_#140249_0%,_#21104f_34%,_#f7f2ec_34%,_#f7f2ec_100%)] text-primary">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-4 sm:px-5 md:gap-8 md:px-8 md:py-8 lg:py-12">
        <Card className="overflow-hidden border border-white/10 bg-[#140249] p-0 text-surface shadow-[0_24px_80px_rgba(20,2,73,0.35)]">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="relative flex flex-col justify-between gap-6 p-5 sm:p-6 md:p-10 lg:p-12">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(254,154,112,0.22),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(117,92,255,0.22),_transparent_32%)]" />
              <div className="relative flex flex-col gap-5 md:gap-6">
                <Badge variant="info" className="w-fit bg-white/10 text-white">
                  <Sparkles size={14} className="mr-2" />
                  Feedback for Oslo Student Hub
                </Badge>
                <div className="max-w-2xl space-y-3 md:space-y-4">
                  <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl md:text-6xl">
                    Gi tilbakemelding på eventet
                  </h1>
                  <p className="max-w-xl text-sm leading-6 text-white/80 sm:text-base md:text-lg md:leading-7">
                    Bruk denne siden fra QR-koden på bord, plakater og skjermer for å
                    velge riktig skjema raskt.
                  </p>
                </div>
              </div>

              <div className="relative flex flex-col gap-3 sm:flex-row">
                <Link
                  href="#skjemaer"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#FE9A70] px-5 py-3 text-sm font-bold text-[#140249] shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#ffb08e] sm:px-6"
                >
                  Se skjemaene
                </Link>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-5 bg-[#F4EEE6] p-5 text-primary sm:p-6 md:p-8 lg:p-10">
              <div className="overflow-hidden rounded-3xl border border-primary/10 bg-white shadow-soft">
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src="/Sitepicture/Fill-in-form.jpg"
                    alt="Skjema og feedback"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover"
                  />
                </div>
              </div>

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

            </div>
          </div>
        </Card>

        <section id="skjemaer" className="flex flex-col gap-4 md:gap-5">
          <SectionHeader
            eyebrow="Skjemaer"
            title="Velg arrangement eller undersøkelse"
            description="Velg riktig skjema under arrangementet. Hvis det ikke er publiserte skjemaer, vises en enkel melding."
          />

          {!hasForms ? (
            <Card className="border border-dashed border-primary/20 bg-white/80 text-sm text-primary/70">
              Ingen publiserte skjemaer er tilgjengelige akkurat nå.
            </Card>
          ) : (
            <div className="grid gap-4 md:gap-5">
              {folders.map((folder) => {
                if (folder.forms.length === 0) return null;

                return (
                  <Card key={folder.id} className="bg-white/90 p-4 sm:p-5 md:p-6">
                    <div className="flex flex-col gap-4 md:gap-5">
                      <div className="flex flex-col gap-2 sm:gap-3 md:flex-row md:items-end md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-black text-primary sm:text-2xl">{folder.name}</h2>
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
                          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full bg-secondary px-5 py-3 text-sm font-bold text-primary transition hover:-translate-y-0.5 hover:bg-secondary/80"
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
                            className="group flex min-h-16 items-center justify-between rounded-2xl border border-primary/10 bg-[#FBF8F4] px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-secondary/60 hover:bg-white hover:shadow-soft sm:px-5"
                          >
                            <div className="min-w-0">
                              <p className="text-base font-bold text-primary sm:text-lg">{form.title}</p>
                              {form.description ? (
                                <p className="mt-1 text-sm leading-6 text-primary/70">
                                  {form.description}
                                </p>
                              ) : null}
                            </div>
                            <div className="ml-4 flex shrink-0 flex-col items-end gap-1 text-xs text-primary/60">
                              <span>{form.questionCount} spørsmål</span>
                              <span className="rounded-full bg-primary/5 px-2 py-1 text-[11px] font-semibold text-primary/60">
                                Åpne
                              </span>
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
      </div>
    </main>
  );
}
