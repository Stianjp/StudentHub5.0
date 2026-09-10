import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TriangleAlert, UsersRound } from "lucide-react";
import {
  addGalaDinnerCompanyAction,
  deleteGalaDinnerAttendeeAction,
  removeGalaDinnerCompanyAction,
} from "@/app/admin/crm/actions";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";
import { GalaDinnerAttendeeForm } from "@/components/admin/gala-dinner-attendee-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { requireRole } from "@/lib/auth";
import { loadGalaDinnerCompanyDetail } from "@/lib/gala-dinner";

type PageProps = {
  params: Promise<{ membershipId: string }>;
};

const PACKAGE_LABELS = {
  standard: "Standard",
  silver: "Sølv",
  gold: "Gull",
  platinum: "Platinum",
} as const;

export default async function GalaDinnerCompanyPage({ params }: PageProps) {
  await requireRole("admin");
  const { membershipId } = await params;
  const detail = await loadGalaDinnerCompanyDetail(membershipId);
  if (!detail) notFound();

  const allergenCount = detail.attendees.filter((attendee) => Boolean(attendee.allergens?.trim())).length;
  const pipelineHref = `/admin/crm?pipeline=${encodeURIComponent(detail.pipeline.id)}`;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={pipelineHref}
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full px-3 text-sm font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Tilbake til gallamiddag-pipelinen
      </Link>

      <SectionHeader
        eyebrow="Gallamiddag"
        title={detail.company.name}
        description={`${detail.event.name} · ${detail.pipeline.name}`}
      />

      {!detail.membership.is_active ? (
        <Card className="border border-warning/40 bg-warning/10">
          <h2 className="text-lg font-bold text-primary">Bedriften er fjernet fra pipelinen</h2>
          <p className="mt-1 text-sm text-ink/80">
            Deltakere og allergener er beholdt. Legg bedriften til igjen for å fortsette redigeringen.
          </p>
          <form action={addGalaDinnerCompanyAction} className="mt-4">
            <input type="hidden" name="pipelineId" value={detail.pipeline.id} />
            <input type="hidden" name="companyId" value={detail.company.id} />
            <Button type="submit" variant="secondary">Legg bedriften til igjen</Button>
          </form>
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">Arrangement</dt>
              <dd className="mt-1 font-bold text-primary">{detail.event.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">Pipelinekolonne</dt>
              <dd className="mt-1 font-bold text-primary">{detail.stage.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink/60">Bedriftspakke</dt>
              <dd className="mt-1 font-bold text-primary">{PACKAGE_LABELS[detail.packageTier]}</dd>
            </div>
          </dl>

          {detail.membership.is_active ? (
            <ConfirmActionForm
              action={removeGalaDinnerCompanyAction}
              fields={{ pipelineId: detail.pipeline.id, membershipId }}
              label="Fjern bedrift"
              confirmMessage={`Fjerne «${detail.company.name}» fra gallamiddag-pipelinen? Deltakere og allergener beholdes.`}
            />
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="flex items-center gap-3">
            <UsersRound aria-hidden="true" className="size-6 text-primary" />
            <div>
              <p className="text-sm font-semibold text-ink/70">Påmeldte deltakere</p>
              <p className="text-2xl font-bold tabular-nums text-primary">{detail.attendees.length}</p>
            </div>
          </div>
        </Card>
        <Card className={allergenCount > 0 ? "border border-red-300 bg-red-50" : ""}>
          <div className="flex items-center gap-3">
            <TriangleAlert aria-hidden="true" className={allergenCount > 0 ? "size-6 text-red-800" : "size-6 text-primary"} />
            <div>
              <p className="text-sm font-semibold text-ink/70">Deltakere med allergener</p>
              <p className={allergenCount > 0 ? "text-2xl font-bold tabular-nums text-red-900" : "text-2xl font-bold tabular-nums text-primary"}>
                {allergenCount}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {detail.membership.is_active ? (
        <Card>
          <h2 className="text-xl font-bold text-primary">Legg til deltaker</h2>
          <p className="mt-1 text-sm text-ink/70">Allergener er valgfritt og er bare tilgjengelig for administratorer.</p>
          <div className="mt-5 max-w-2xl">
            <GalaDinnerAttendeeForm membershipId={membershipId} />
          </div>
        </Card>
      ) : null}

      <section aria-labelledby="gala-attendees-heading">
        <div className="mb-4">
          <h2 id="gala-attendees-heading" className="text-xl font-bold text-primary">Deltakerliste</h2>
          <p className="text-sm text-ink/70">Rediger navn og allergener, eller slett en deltaker.</p>
        </div>

        {detail.attendees.length === 0 ? (
          <Card className="text-sm text-ink/70">Ingen deltakere er lagt til ennå.</Card>
        ) : (
          <div className="grid gap-4">
            {detail.attendees.map((attendee) => (
              <Card key={attendee.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h3 className="break-words text-lg font-bold text-primary">{attendee.full_name}</h3>
                    {attendee.allergens ? (
                      <div className="mt-2 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-950">
                        <p className="flex items-center gap-2 font-bold">
                          <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
                          Allergener
                        </p>
                        <p className="mt-1 whitespace-pre-wrap break-words">{attendee.allergens}</p>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-ink/65">Ingen allergener registrert.</p>
                    )}
                  </div>

                  {detail.membership.is_active ? (
                    <ConfirmActionForm
                      action={deleteGalaDinnerAttendeeAction}
                      fields={{ membershipId, attendeeId: attendee.id }}
                      label="Slett deltaker"
                      confirmMessage={`Slette «${attendee.full_name}» fra deltakerlisten?`}
                      className="shrink-0"
                    />
                  ) : null}
                </div>

                {detail.membership.is_active ? (
                  <details className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                    <summary className="cursor-pointer text-sm font-bold text-primary">Rediger deltaker</summary>
                    <div className="mt-4 max-w-2xl">
                      <GalaDinnerAttendeeForm
                        membershipId={membershipId}
                        attendeeId={attendee.id}
                        defaultFullName={attendee.full_name}
                        defaultAllergens={attendee.allergens}
                      />
                    </div>
                  </details>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
