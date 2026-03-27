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
  updateContactCompanyOwnerAction,
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
  if (direction === "inbound") return "border-[#D46839]/25 bg-white";
  if (direction === "outbound") return "border-success/25 bg-white";
  return "border-primary/15 bg-white";
}

function messageBodyTone(direction: "inbound" | "outbound" | "internal_note") {
  if (direction === "inbound") return "bg-[#FFF8F0]";
  if (direction === "outbound") return "bg-[#F4FBF6]";
  return "bg-[#F7F3FF]";
}

export default async function ContactOverviewCompanyPage({ params, searchParams }: PageProps) {
  const profile = await requireRole("admin");
  const { contactCompanyId } = await params;
  const resolvedSearchParams = await searchParams;
  const selectedCaseId = firstValue(resolvedSearchParams.case);
  const saved = firstValue(resolvedSearchParams.saved) === "1";
  const sent = firstValue(resolvedSearchParams.sent) === "1";
  const error = firstValue(resolvedSearchParams.error);

  const detail = await getContactOverviewCompanyDetail(contactCompanyId, selectedCaseId || null, profile.id);
  if (!detail) notFound();

  const pageBase = `/admin/email/contact-overview/${contactCompanyId}`;
  const caseReturnTo = detail.activeCase ? `${pageBase}?case=${detail.activeCase.id}` : pageBase;
  const defaultTo = detail.activeCase?.contact_email ?? detail.company.primary_email ?? "";

  return (
    <div className="contact-overview-page contact-overview-detail flex flex-col gap-8">
        <SectionHeader
          eyebrow="E-post / Kontaktoversikt"
          title={detail.company.display_name}
          description={`${detail.company.primary_domain}${detail.company.primary_email ? ` · ${detail.company.primary_email}` : ""}`}
          tone="light"
          actions={
            <>
              <Link
                href="/admin/email/contact-overview"
                className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
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

        <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)_22rem]">
          <div className="flex flex-col gap-6">
            <Card className="flex flex-col gap-4 border border-[#D46839]/15 bg-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6E4DB0]">Kontaktprofil</p>
                <h3 className="text-lg font-bold text-[#2D1C63]">{detail.company.display_name}</h3>
              </div>
              <div className="grid gap-2 text-sm text-[#30224F]">
                <p>
                  <span className="font-semibold text-[#2D1C63]">Domene:</span> {detail.company.primary_domain}
                </p>
                <p>
                  <span className="font-semibold text-[#2D1C63]">Primær e-post:</span>{" "}
                  {detail.company.primary_email ?? "Ikke satt"}
                </p>
                <p>
                  <span className="font-semibold text-[#2D1C63]">Linked company:</span>{" "}
                  {detail.linkedCompany ? (
                    <Link href={`/admin/companies/${detail.linkedCompany.id}`} className="font-semibold text-[#140249] underline underline-offset-2">
                      {detail.linkedCompany.name}
                    </Link>
                  ) : (
                    "Ingen kobling"
                  )}
                </p>
              </div>
              <form action={updateContactCompanyOwnerAction} className="flex flex-col gap-3">
                <input type="hidden" name="contactCompanyId" value={contactCompanyId} />
                <input type="hidden" name="returnTo" value={caseReturnTo} />
                <label className="text-sm font-semibold text-[#2D1C63]">
                  Sakseier
                  <Select
                    name="ownerProfileId"
                    defaultValue={detail.company.owner_profile_id ?? ""}
                    className="border-[#6E4DB0]/25 bg-white"
                  >
                    <option value="">Utdelt senere</option>
                    {detail.owners.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.full_name ?? "Admin"}
                      </option>
                    ))}
                  </Select>
                </label>
                <Button type="submit" variant="secondary">
                  Lagre eier
                </Button>
              </form>
            </Card>

            <Card className="flex flex-col gap-4 border border-[#D46839]/15 bg-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#6E4DB0]">Saker</p>
                  <h3 className="text-lg font-bold text-[#2D1C63]">Aktive saker</h3>
                </div>
                {detail.unreadCount > 0 ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#D46839]/15 px-3 py-1 text-xs font-semibold text-[#D46839]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#D46839]" />
                    {detail.unreadCount} ulest
                  </span>
                ) : null}
              </div>
              {detail.cases.length === 0 ? (
                <p className="text-sm text-[#2D1C63]/70">Ingen saker opprettet ennå.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {detail.cases.map((caseRow) => {
                    const href = `${pageBase}?case=${caseRow.id}`;
                    const isActive = caseRow.id === detail.activeCase?.id;
                    const unreadForCase = detail.caseUnreadCounts[caseRow.id] ?? 0;
                    return (
                      <Link
                        key={caseRow.id}
                        href={href}
                        className={`contact-overview-case-link rounded-2xl border px-4 py-3 ${
                          isActive
                            ? "border-[#D46839]/30 bg-[#FFF0D7] text-[#2D1C63]"
                            : "border-[#6E4DB0]/10 bg-white text-[#30224F]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#140249]">{caseRow.title}</p>
                            <p className="mt-1 text-xs text-[#5B5078]">{caseRow.case_number}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {unreadForCase > 0 ? (
                              <span className="inline-flex items-center gap-2 rounded-full bg-[#D46839]/15 px-2.5 py-1 text-[11px] font-semibold text-[#D46839]">
                                <span className="h-2 w-2 rounded-full bg-[#D46839]" />
                                {unreadForCase}
                              </span>
                            ) : null}
                            <Badge variant={caseStatusVariant(caseRow.status)}>{caseStatusLabel(caseRow.status)}</Badge>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            {detail.activeCase ? (
              <Card className="flex flex-col gap-4 border border-[#D46839]/15 bg-white">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#6E4DB0]">Skriv e-post</p>
                  <h3 className="text-lg font-bold text-[#2D1C63]">Send fra stian@oslostudenthub.no</h3>
                </div>
                <form action={sendContactCaseEmailAction} className="flex flex-col gap-3">
                  <input type="hidden" name="caseId" value={detail.activeCase.id} />
                  <input type="hidden" name="returnTo" value={caseReturnTo} />
                  <label className="text-sm font-semibold text-[#2D1C63]">
                    Til
                    <Input name="to" required defaultValue={defaultTo} placeholder="kontakt@bedrift.no" className="border-[#6E4DB0]/20 bg-white" />
                  </label>
                  <label className="text-sm font-semibold text-[#2D1C63]">
                    CC
                    <Input name="cc" placeholder="valgfri@bedrift.no" className="border-[#6E4DB0]/20 bg-white" />
                  </label>
                  <label className="text-sm font-semibold text-[#2D1C63]">
                    Emne
                    <Input name="subject" required defaultValue={detail.activeCase.title} className="border-[#6E4DB0]/20 bg-white" />
                  </label>
                  <label className="text-sm font-semibold text-[#2D1C63]">
                    Melding
                    <Textarea
                      name="htmlBody"
                      required
                      rows={8}
                      placeholder="Hei! Vi mangler fortsatt logo og bekreftelse på bord/stoler før Student Connect 2026."
                      className="border-[#6E4DB0]/20 bg-white"
                    />
                  </label>
                  <Button type="submit">Send e-post</Button>
                </form>
              </Card>
            ) : null}

            <Card className="flex flex-col gap-5 border border-[#D46839]/15 bg-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#6E4DB0]">Tidslinje</p>
                  <h3 className="text-lg font-bold text-[#2D1C63]">
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
                <p className="text-sm text-[#2D1C63]/70">Velg eller opprett en sak for å se kommunikasjonen.</p>
              ) : detail.activeCaseMessages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#6E4DB0]/20 bg-[#F7EFE2] p-6 text-sm text-[#2D1C63]/70">
                  Ingen meldinger logget på denne saken ennå.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {detail.activeCaseMessages.map((message) => (
                    <div key={message.id} className={`rounded-2xl border p-4 ${messageTone(message.direction)}`}>
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[#2D1C63]">
                            {message.direction === "inbound"
                              ? "Innkommende"
                              : message.direction === "outbound"
                                ? "Utgående"
                                : "Intern note"}
                          </p>
                          <p className="text-xs text-[#2D1C63]/70">
                            Fra {message.from_name ? `${message.from_name} · ` : ""}
                            {message.from_email}
                          </p>
                          <p className="text-xs text-[#2D1C63]/70">
                            Til {message.to_emails.join(", ") || "Ingen mottaker logget"}
                            {message.cc_emails.length ? ` · CC ${message.cc_emails.join(", ")}` : ""}
                          </p>
                        </div>
                        <div className="text-right text-xs text-[#2D1C63]/60">
                          <p>{formatContactOverviewTimestamp(message.received_at ?? message.sent_at ?? message.created_at)}</p>
                          <p>{message.subject || "Uten emne"}</p>
                        </div>
                      </div>

                      <div className={`mt-4 rounded-2xl p-4 text-sm text-[#1A1626] ${messageBodyTone(message.direction)}`}>
                        <p className="whitespace-pre-wrap">{summarizeMessageBody(message)}</p>
                      </div>

                      {detail.relatedCases.length > 0 ? (
                        <form action={moveMessageAction} className="mt-4 flex flex-col gap-2 md:flex-row md:items-end">
                          <input type="hidden" name="messageId" value={message.id} />
                          <input type="hidden" name="returnTo" value={caseReturnTo} />
                          <label className="flex-1 text-xs font-semibold text-[#2D1C63]">
                            Flytt melding til annen sak
                            <Select name="targetCaseId" defaultValue={detail.relatedCases[0]?.id} className="border-[#6E4DB0]/25 bg-white">
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
          </div>

          <div className="flex flex-col gap-6">
            {detail.activeCase ? (
              <>
                <Card className="flex flex-col gap-4 border border-[#D46839]/15 bg-white">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6E4DB0]">Saksdetaljer</p>
                    <h3 className="text-lg font-bold text-[#2D1C63]">Rediger sak</h3>
                  </div>
                  <form action={updateContactCaseAction} className="flex flex-col gap-3">
                    <input type="hidden" name="caseId" value={detail.activeCase.id} />
                    <input type="hidden" name="returnTo" value={caseReturnTo} />
                    <label className="text-sm font-semibold text-[#2D1C63]">
                      Tittel
                      <Input name="title" required defaultValue={detail.activeCase.title} className="border-[#6E4DB0]/20 bg-white" />
                    </label>
                    <label className="text-sm font-semibold text-[#2D1C63]">
                      Event
                      <Select name="eventId" defaultValue={detail.activeCase.event_id ?? ""} className="border-[#6E4DB0]/25 bg-white">
                        <option value="">Uten event</option>
                        {detail.eventOptions.map((event) => (
                          <option key={event.id} value={event.id}>
                            {event.name}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="text-sm font-semibold text-[#2D1C63]">
                      Kontaktperson
                      <Input name="contactName" defaultValue={detail.activeCase.contact_name ?? ""} className="border-[#6E4DB0]/20 bg-white" />
                    </label>
                    <label className="text-sm font-semibold text-[#2D1C63]">
                      Kontakt-e-post
                      <Input name="contactEmail" defaultValue={detail.activeCase.contact_email ?? ""} className="border-[#6E4DB0]/20 bg-white" />
                    </label>
                    <label className="text-sm font-semibold text-[#2D1C63]">
                      Status
                      <Select name="status" defaultValue={detail.activeCase.status} className="border-[#6E4DB0]/25 bg-white">
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

                <Card className="flex flex-col gap-4 border border-[#D46839]/15 bg-white">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6E4DB0]">Tjenestemål</p>
                    <h3 className="text-lg font-bold text-[#2D1C63]">Sjekkliste</h3>
                  </div>
                  <div className="flex flex-col gap-3">
                    {detail.activeCaseChecklist.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-[#6E4DB0]/10 bg-[#FCFAFF] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#2D1C63]">{getChecklistLabel(item.item_key)}</p>
                            <p className="mt-1 text-xs text-[#2D1C63]/70">
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

                <Card className="flex flex-col gap-4 border border-[#D46839]/15 bg-white">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6E4DB0]">Ny sak</p>
                    <h3 className="text-lg font-bold text-[#2D1C63]">Opprett ekstra sak</h3>
                  </div>
                  <form action={createContactCaseAction} className="flex flex-col gap-3">
                    <input type="hidden" name="contactCompanyId" value={contactCompanyId} />
                    <input type="hidden" name="returnTo" value={pageBase} />
                    <label className="text-sm font-semibold text-[#2D1C63]">
                      Tittel (valgfritt)
                      <Input name="title" placeholder="Student Connect 2026 - Bedrift x Oslo Student Hub" className="border-[#6E4DB0]/20 bg-white" />
                    </label>
                    <label className="text-sm font-semibold text-[#2D1C63]">
                      Event
                      <Select name="eventId" defaultValue="" className="border-[#6E4DB0]/25 bg-white">
                        <option value="">Uten event</option>
                        {detail.eventOptions.map((event) => (
                          <option key={event.id} value={event.id}>
                            {event.name}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="text-sm font-semibold text-[#2D1C63]">
                      Kontaktperson
                      <Input name="contactName" placeholder="Navn" className="border-[#6E4DB0]/20 bg-white" />
                    </label>
                    <label className="text-sm font-semibold text-[#2D1C63]">
                      Kontakt-e-post
                      <Input name="contactEmail" placeholder="kontakt@bedrift.no" className="border-[#6E4DB0]/20 bg-white" />
                    </label>
                    <Button type="submit" variant="secondary">Opprett sak</Button>
                  </form>
                </Card>

                <Card className="flex flex-col gap-4 border border-[#D46839]/15 bg-white">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6E4DB0]">Sakshåndtering</p>
                    <h3 className="text-lg font-bold text-[#2D1C63]">Merge og arkiv</h3>
                  </div>
                  {detail.activeCase.status === "unsorted" && detail.relatedCases.length > 0 ? (
                    <form action={mergeCaseAction} className="flex flex-col gap-3">
                      <input type="hidden" name="sourceCaseId" value={detail.activeCase.id} />
                      <input type="hidden" name="returnTo" value={pageBase} />
                      <label className="text-sm font-semibold text-[#2D1C63]">
                        Merge usortert sak inn i
                        <Select name="targetCaseId" defaultValue={detail.relatedCases[0]?.id} className="border-[#6E4DB0]/25 bg-white">
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
                    <p className="text-sm text-[#2D1C63]/70">
                      Merge vises når valgt sak er usortert og bedriften har en annen aktiv sak å flette inn i.
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
              <Card className="bg-white text-sm text-[#4A3D6A]">Opprett en sak for å få opp sjekkliste og status.</Card>
            )}
          </div>
        </div>
    </div>
  );
}
