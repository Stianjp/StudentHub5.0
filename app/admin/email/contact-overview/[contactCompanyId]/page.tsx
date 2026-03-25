import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireRole } from "@/lib/auth";
import {
  caseStatusLabel,
  caseStatusVariant,
  formatContactOverviewTimestamp,
  getContactOverviewCompanyDetail,
  getChecklistLabel,
  summarizeMessageBody,
} from "@/lib/email-contact-overview";
import {
  archiveContactCompanyAction,
  createContactCaseAction,
  mergeCaseAction,
  moveMessageAction,
  sendContactCaseEmailAction,
  syncContactOverviewAction,
  toggleChecklistItemAction,
  updateContactCaseAction,
} from "../actions";

type PageProps = {
  params: Promise<{ contactCompanyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function messageTone(direction: "inbound" | "outbound" | "internal_note") {
  if (direction === "inbound") return "border-info/20 bg-info/5";
  if (direction === "outbound") return "border-success/20 bg-success/5";
  return "border-primary/10 bg-primary/5";
}

export default async function ContactOverviewCompanyPage({ params, searchParams }: PageProps) {
  await requireRole("admin");
  const { contactCompanyId } = await params;
  const resolvedSearchParams = await searchParams;
  const selectedCaseId = firstValue(resolvedSearchParams.case);
  const saved = firstValue(resolvedSearchParams.saved) === "1";
  const sent = firstValue(resolvedSearchParams.sent) === "1";
  const error = firstValue(resolvedSearchParams.error);

  const detail = await getContactOverviewCompanyDetail(contactCompanyId, selectedCaseId || null);
  if (!detail) notFound();

  const pageBase = `/admin/email/contact-overview/${contactCompanyId}`;
  const caseReturnTo = detail.activeCase ? `${pageBase}?case=${detail.activeCase.id}` : pageBase;
  const defaultTo = detail.activeCase?.contact_email ?? detail.company.primary_email ?? "";

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="E-post / Kontaktoversikt"
        title={detail.company.display_name}
        description={`${detail.company.primary_domain}${detail.company.primary_email ? ` · ${detail.company.primary_email}` : ""}`}
        actions={
          <>
            <Link
              href="/admin/email/contact-overview"
              className="inline-flex items-center justify-center rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary transition hover:border-secondary hover:bg-secondary/10 hover:text-secondary"
            >
              Tilbake til oversikt
            </Link>
            <form action={syncContactOverviewAction}>
              <input type="hidden" name="returnTo" value={caseReturnTo} />
              <Button type="submit" variant="secondary" className="rounded-xl px-4 py-2 text-xs">
                Sync nå
              </Button>
            </form>
          </>
        }
      />

      {saved ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">
          Endringen er lagret.
        </Card>
      ) : null}
      {sent ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">
          E-post er sendt og lagt i tidslinjen.
        </Card>
      ) : null}
      {error ? (
        <Card className="border border-error/30 bg-error/10 text-sm text-error">
          {decodeURIComponent(error)}
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Kontaktprofil</p>
              <h3 className="text-lg font-bold text-primary">{detail.company.display_name}</h3>
            </div>
            <div className="grid gap-2 text-sm text-ink/80">
              <p>
                <span className="font-semibold text-primary">Domene:</span> {detail.company.primary_domain}
              </p>
              <p>
                <span className="font-semibold text-primary">Primær e-post:</span>{" "}
                {detail.company.primary_email ?? "Ikke satt"}
              </p>
              <p>
                <span className="font-semibold text-primary">Linked company:</span>{" "}
                {detail.linkedCompany ? (
                  <Link href={`/admin/companies/${detail.linkedCompany.id}`} className="underline">
                    {detail.linkedCompany.name}
                  </Link>
                ) : (
                  "Ingen kobling"
                )}
              </p>
            </div>
          </Card>

          <Card className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Saker</p>
              <h3 className="text-lg font-bold text-primary">Velg sak</h3>
            </div>
            {detail.cases.length === 0 ? (
              <p className="text-sm text-ink/70">Ingen saker opprettet ennå.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {detail.cases.map((caseRow) => {
                  const href = `${pageBase}?case=${caseRow.id}`;
                  const isActive = caseRow.id === detail.activeCase?.id;
                  return (
                    <Link
                      key={caseRow.id}
                      href={href}
                      className={`rounded-2xl border px-4 py-3 transition ${
                        isActive
                          ? "border-secondary bg-secondary/15 text-primary"
                          : "border-primary/10 bg-primary/5 text-ink/80 hover:border-secondary/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{caseRow.title}</p>
                          <p className="mt-1 text-xs opacity-75">{caseRow.case_number}</p>
                        </div>
                        <Badge variant={caseStatusVariant(caseRow.status)}>{caseStatusLabel(caseRow.status)}</Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Ny sak</p>
              <h3 className="text-lg font-bold text-primary">Opprett ekstra sak</h3>
            </div>
            <form action={createContactCaseAction} className="flex flex-col gap-3">
              <input type="hidden" name="contactCompanyId" value={contactCompanyId} />
              <input type="hidden" name="returnTo" value={pageBase} />
              <label className="text-sm font-semibold text-primary">
                Tittel (valgfritt)
                <Input name="title" placeholder="Student Connect 2026 - Bedrift x Oslo Student Hub" />
              </label>
              <label className="text-sm font-semibold text-primary">
                Event
                <Select name="eventId" defaultValue="">
                  <option value="">Uten event</option>
                  {detail.eventOptions.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="text-sm font-semibold text-primary">
                Kontaktperson
                <Input name="contactName" placeholder="Navn" />
              </label>
              <label className="text-sm font-semibold text-primary">
                Kontakt-e-post
                <Input name="contactEmail" placeholder="kontakt@bedrift.no" />
              </label>
              <Button type="submit">Opprett sak</Button>
            </form>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Tidslinje</p>
                <h3 className="text-lg font-bold text-primary">
                  {detail.activeCase ? detail.activeCase.title : "Ingen valgt sak"}
                </h3>
              </div>
              {detail.activeCase ? (
                <Badge variant={caseStatusVariant(detail.activeCase.status)}>
                  {caseStatusLabel(detail.activeCase.status)}
                </Badge>
              ) : null}
            </div>

            {!detail.activeCase ? (
              <p className="text-sm text-ink/70">Velg eller opprett en sak for å se kommunikasjonen.</p>
            ) : detail.activeCaseMessages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-6 text-sm text-ink/70">
                Ingen meldinger logget på denne saken ennå. Du kan sende første e-post nedenfor eller kjøre sync.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {detail.activeCaseMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-2xl border p-4 ${messageTone(message.direction)}`}
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-primary">
                          {message.direction === "inbound" ? "Innkommende" : message.direction === "outbound" ? "Utgående" : "Intern note"}
                        </p>
                        <p className="text-xs text-ink/70">
                          Fra {message.from_name ? `${message.from_name} · ` : ""}
                          {message.from_email}
                        </p>
                        <p className="text-xs text-ink/70">
                          Til {message.to_emails.join(", ") || "Ingen mottaker logget"}
                          {message.cc_emails.length ? ` · CC ${message.cc_emails.join(", ")}` : ""}
                        </p>
                      </div>
                      <div className="text-right text-xs text-ink/60">
                        <p>{formatContactOverviewTimestamp(message.received_at ?? message.sent_at ?? message.created_at)}</p>
                        <p>{message.subject || "Uten emne"}</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-surface/70 p-4 text-sm text-ink/80">
                      <p className="whitespace-pre-wrap">{summarizeMessageBody(message)}</p>
                    </div>

                    {detail.relatedCases.length > 0 ? (
                      <form action={moveMessageAction} className="mt-4 flex flex-col gap-2 md:flex-row md:items-end">
                        <input type="hidden" name="messageId" value={message.id} />
                        <input type="hidden" name="returnTo" value={caseReturnTo} />
                        <label className="flex-1 text-xs font-semibold text-primary">
                          Flytt melding til annen sak
                          <Select name="targetCaseId" defaultValue={detail.relatedCases[0]?.id}>
                            {detail.relatedCases.map((caseRow) => (
                              <option key={caseRow.id} value={caseRow.id}>
                                {caseRow.case_number} · {caseRow.title}
                              </option>
                            ))}
                          </Select>
                        </label>
                        <Button type="submit" variant="ghost" className="rounded-xl px-4 py-2 text-xs">
                          Flytt melding
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {detail.activeCase ? (
            <Card className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Skriv e-post</p>
                <h3 className="text-lg font-bold text-primary">Send fra {`stian@oslostudenthub.no`}</h3>
              </div>
              <form action={sendContactCaseEmailAction} className="flex flex-col gap-3">
                <input type="hidden" name="caseId" value={detail.activeCase.id} />
                <input type="hidden" name="returnTo" value={caseReturnTo} />
                <label className="text-sm font-semibold text-primary">
                  Til
                  <Input name="to" required defaultValue={defaultTo} placeholder="kontakt@bedrift.no" />
                </label>
                <label className="text-sm font-semibold text-primary">
                  CC
                  <Input name="cc" placeholder="valgfri@bedrift.no" />
                </label>
                <label className="text-sm font-semibold text-primary">
                  Emne
                  <Input name="subject" required defaultValue={detail.activeCase.title} />
                </label>
                <label className="text-sm font-semibold text-primary">
                  Melding
                  <Textarea
                    name="htmlBody"
                    required
                    rows={10}
                    placeholder="Hei! Vi mangler fortsatt logo og bekreftelse på bord/stoler før Student Connect 2026."
                  />
                </label>
                <Button type="submit">Send e-post</Button>
              </form>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          {detail.activeCase ? (
            <>
              <Card className="flex flex-col gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Saksdetaljer</p>
                  <h3 className="text-lg font-bold text-primary">Rediger sak</h3>
                </div>
                <form action={updateContactCaseAction} className="flex flex-col gap-3">
                  <input type="hidden" name="caseId" value={detail.activeCase.id} />
                  <input type="hidden" name="returnTo" value={caseReturnTo} />
                  <label className="text-sm font-semibold text-primary">
                    Tittel
                    <Input name="title" required defaultValue={detail.activeCase.title} />
                  </label>
                  <label className="text-sm font-semibold text-primary">
                    Event
                    <Select name="eventId" defaultValue={detail.activeCase.event_id ?? ""}>
                      <option value="">Uten event</option>
                      {detail.eventOptions.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.name}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="text-sm font-semibold text-primary">
                    Kontaktperson
                    <Input name="contactName" defaultValue={detail.activeCase.contact_name ?? ""} />
                  </label>
                  <label className="text-sm font-semibold text-primary">
                    Kontakt-e-post
                    <Input name="contactEmail" defaultValue={detail.activeCase.contact_email ?? ""} />
                  </label>
                  <label className="text-sm font-semibold text-primary">
                    Status
                    <Select name="status" defaultValue={detail.activeCase.status}>
                      <option value="unsorted">Usortert</option>
                      <option value="open">Åpen</option>
                      <option value="closed">Lukket</option>
                      <option value="archived">Arkivert</option>
                    </Select>
                  </label>
                  <Button type="submit" variant="secondary">
                    Lagre saksdetaljer
                  </Button>
                </form>
              </Card>

              <Card className="flex flex-col gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Tjenestemål</p>
                  <h3 className="text-lg font-bold text-primary">Sjekkliste</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {detail.activeCaseChecklist.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-primary">{getChecklistLabel(item.item_key)}</p>
                          <p className="mt-1 text-xs text-ink/70">
                            {item.is_completed
                              ? `Fullført ${formatContactOverviewTimestamp(item.completed_at)}`
                              : "Ikke fullført ennå"}
                          </p>
                        </div>
                        <form action={toggleChecklistItemAction}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <input type="hidden" name="completed" value={item.is_completed ? "0" : "1"} />
                          <input type="hidden" name="returnTo" value={caseReturnTo} />
                          <Button type="submit" variant={item.is_completed ? "ghost" : "secondary"} className="rounded-xl px-4 py-2 text-xs">
                            {item.is_completed ? "Åpne igjen" : "Marker fullført"}
                          </Button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="flex flex-col gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Sakshåndtering</p>
                  <h3 className="text-lg font-bold text-primary">Merge og arkiv</h3>
                </div>
                {detail.activeCase.status === "unsorted" && detail.relatedCases.length > 0 ? (
                  <form action={mergeCaseAction} className="flex flex-col gap-3">
                    <input type="hidden" name="sourceCaseId" value={detail.activeCase.id} />
                    <input type="hidden" name="returnTo" value={pageBase} />
                    <label className="text-sm font-semibold text-primary">
                      Merge usortert sak inn i
                      <Select name="targetCaseId" defaultValue={detail.relatedCases[0]?.id}>
                        {detail.relatedCases.map((caseRow) => (
                          <option key={caseRow.id} value={caseRow.id}>
                            {caseRow.case_number} · {caseRow.title}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <Button type="submit" variant="secondary">
                      Merge sak
                    </Button>
                  </form>
                ) : (
                  <p className="text-sm text-ink/70">
                    Merge vises når valgt sak er usortert og bedriften har en annen sak å flette inn i.
                  </p>
                )}

                <form action={archiveContactCompanyAction}>
                  <input type="hidden" name="contactCompanyId" value={contactCompanyId} />
                  <Button type="submit" variant="danger" className="w-full">
                    Arkiver kontaktbedrift
                  </Button>
                </form>
              </Card>
            </>
          ) : (
            <Card className="text-sm text-ink/70">
              Opprett en sak for å få opp sjekkliste, status og merge-håndtering.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
