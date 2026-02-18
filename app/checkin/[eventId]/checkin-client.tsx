'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type TicketRow = {
  id: string;
  ticket_number: string;
  status: string;
  checked_in_at: string | null;
  attendee_name?: string | null;
  attendee_email?: string | null;
  attendee_phone?: string | null;
  company?: {
    id: string;
    name: string | null;
  } | null;
  student?: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    study_program: string | null;
    study_level: string | null;
    study_year: number | null;
  } | null;
};

type PrintPayload = {
  ticketNumber: string;
  fullName: string;
  studyProgram: string;
  studyLevel: string;
  studyYear: number | "";
  email: string;
  phone: string;
  companyName: string;
};

export function CheckinClient({ eventId }: { eventId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TicketRow[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [printerUrl, setPrinterUrl] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "student" | "company">("all");
  const [activeQuery, setActiveQuery] = useState<string>("");
  const [totalAllCount, setTotalAllCount] = useState<number>(0);
  const [checkedInAllCount, setCheckedInAllCount] = useState<number>(0);
  const [lastPrint, setLastPrint] = useState<PrintPayload | null>(null);
  const autoSearchTimeoutRef = useRef<number | null>(null);
  const lastAutoQueryRef = useRef<string>("");

  const parsedQr = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed?.t && parsed?.e) return parsed as { t: string; e: string };
    } catch {
      // ignore
    }
    return null;
  }, [query]);

  function isTicketQuery(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith("T-")) return true;
    return /^[A-Z0-9-]{6,}$/.test(trimmed);
  }

  async function lookupTickets(overrideFilter?: "all" | "student" | "company") {
    if (!query.trim()) return;
    setStatus("loading");
    setMessage(null);
    const activeFilter = overrideFilter ?? filter;
    const input = query.trim();
    const ticketOnly = isTicketQuery(input);
    const response = await fetch(`/api/checkin/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        query: parsedQr?.t ? parsedQr.t : input,
        mode: parsedQr?.t || ticketOnly ? "ticket" : "text",
        filter: activeFilter,
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setStatus("error");
      setMessage(payload?.error ?? "Kunne ikke søke.");
      return;
    }
    const payload = await response.json();
    const nextResults = (payload?.results ?? []) as TicketRow[];
    setResults(nextResults);
    setActiveQuery(query.trim());
    const total = nextResults.length ?? 0;
    const checked = nextResults.filter((row: TicketRow) => Boolean(row.checked_in_at)).length;
    setTotalAllCount(total);
    setCheckedInAllCount(checked);
    setStatus("success");

    if ((parsedQr?.t || ticketOnly) && nextResults.length === 1 && !nextResults[0].checked_in_at) {
      void checkinAndPrint(nextResults[0].id);
    }
  }

  async function loadParticipants(
    nextFilter?: "all" | "student" | "company",
    updateTotals: boolean = true,
  ) {
    setStatus("loading");
    setMessage(null);
    const response = await fetch(`/api/checkin/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        mode: "all",
        filter: nextFilter ?? filter,
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setStatus("error");
      setMessage(payload?.error ?? "Kunne ikke hente deltakere.");
      return;
    }
    const payload = await response.json();
    setResults(payload?.results ?? []);
    setActiveQuery("");
    const total = payload?.results?.length ?? 0;
    const checked = (payload?.results ?? []).filter((row: TicketRow) => Boolean(row.checked_in_at)).length;
    if (updateTotals) {
      setTotalAllCount(total);
      setCheckedInAllCount(checked);
    }
    setStatus("success");
  }

  useEffect(() => {
    void loadParticipants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      lastAutoQueryRef.current = "";
      if (autoSearchTimeoutRef.current) {
        window.clearTimeout(autoSearchTimeoutRef.current);
        autoSearchTimeoutRef.current = null;
      }
      return;
    }
    if (!isTicketQuery(trimmed)) return;
    if (trimmed === lastAutoQueryRef.current) return;
    if (autoSearchTimeoutRef.current) {
      window.clearTimeout(autoSearchTimeoutRef.current);
    }
    autoSearchTimeoutRef.current = window.setTimeout(() => {
      lastAutoQueryRef.current = trimmed;
      void lookupTickets();
    }, 150);
  }, [query]);

  async function handleFilterChange(nextFilter: "all" | "student" | "company") {
    setFilter(nextFilter);
    if (query.trim()) {
      await lookupTickets(nextFilter);
      return;
    }
    await loadParticipants(nextFilter, nextFilter === "all");
  }

  async function clearSearch() {
    setQuery("");
    setActiveQuery("");
    await loadParticipants(filter, filter === "all");
  }

  async function checkinAndPrint(ticketId: string) {
    const existing = results.find((row) => row.id === ticketId);
    setStatus("loading");
    setMessage(null);
    const response = await fetch(`/api/checkin/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, ticketId, printerUrl }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setStatus("error");
      setMessage(payload?.error ?? "Kunne ikke oppdatere innsjekk.");
      return;
    }
    const payload = (await response.json()) as {
      action?: "checked_in" | "reverted";
      ticket?: TicketRow;
      print?: PrintPayload | null;
    };
    const printPayload = payload.print as PrintPayload | undefined;
    setResults((prev) => prev.map((row) => (row.id === ticketId ? { ...row, ...payload.ticket } : row)));
    if (payload.action === "checked_in" && payload.ticket?.checked_in_at && !existing?.checked_in_at) {
      setCheckedInAllCount((prev) => prev + 1);
    }
    if (payload.action === "reverted" && existing?.checked_in_at) {
      setCheckedInAllCount((prev) => Math.max(0, prev - 1));
    }
    if (printPayload) {
      setLastPrint(printPayload);
    }
    setStatus("success");
    setMessage(payload.action === "reverted" ? "Innsjekk angret." : "Sjekk inn OK.");
  }

  return (
    <div className="grid gap-6">
      <Card className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Søk / skann QR
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void lookupTickets();
                }
              }}
              placeholder="Ticketnummer (QR), navn, e-post eller telefon."
            />
          </label>
          <label className="text-sm font-semibold text-primary">
            Printer-URL (valgfritt)
            <Input
              value={printerUrl}
              onChange={(event) => setPrinterUrl(event.target.value)}
              placeholder="http://localhost:xxxx/print"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void lookupTickets()}>
            Søk
          </Button>
          {activeQuery ? (
            <button
              type="button"
              onClick={() => void clearSearch()}
              className="inline-flex items-center gap-2 rounded-full border border-secondary/50 bg-secondary/15 px-3 py-1 text-xs font-semibold text-primary transition hover:border-secondary hover:text-secondary"
            >
              Søk: {activeQuery}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>
        {message ? (
          <p className={`rounded-xl px-3 py-2 text-sm font-semibold ${status === "error" ? "bg-error/15 text-error" : "bg-success/15 text-success"}`}>
            {message}
          </p>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-primary">Påmeldte deltakere</h3>
          <div className="text-xs font-semibold text-primary/70">
            Sjekket inn {checkedInAllCount}/{totalAllCount}
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Button type="button" variant={filter === "all" ? "primary" : "secondary"} onClick={() => handleFilterChange("all")}>Alle</Button>
            <Button type="button" variant={filter === "student" ? "primary" : "secondary"} onClick={() => handleFilterChange("student")}>Studenter</Button>
            <Button type="button" variant={filter === "company" ? "primary" : "secondary"} onClick={() => handleFilterChange("company")}>Bedrifter</Button>
          </div>
        </div>
        {results.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen deltakere funnet.</p>
        ) : (
          <div className="grid gap-2">
            {results.map((ticket) => (
              <div key={ticket.id} className="flex flex-col gap-2 rounded-xl border border-primary/10 bg-primary/5 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-primary">{ticket.student?.full_name ?? ticket.attendee_name ?? "Ukjent deltaker"}</p>
                    <p className="text-xs text-ink/60">{ticket.student?.email ?? ticket.attendee_email ?? "—"} · {ticket.student?.phone ?? ticket.attendee_phone ?? "—"}</p>
                    <p className="text-xs text-ink/60">
                      {ticket.company?.name ? `Bedrift: ${ticket.company.name}` : ticket.company ? "Bedrift" : ticket.student ? "Student" : "Andre"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={ticket.checked_in_at ? "danger" : "secondary"}
                    onClick={() => checkinAndPrint(ticket.id)}
                  >
                    {ticket.checked_in_at ? "Angre innsjekk" : "Sjekk inn + print"}
                  </Button>
                </div>
                <div className="text-xs text-ink/60">
                  Ticket: {ticket.ticket_number} · {ticket.student?.study_program ?? "—"} · {ticket.student?.study_level ?? ""} {ticket.student?.study_year ? `${ticket.student.study_year}. år` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {lastPrint ? (
        <Card className="flex flex-col gap-2 text-xs text-ink/70">
          <p className="text-sm font-semibold text-primary">Siste print</p>
          <p>Navn: {lastPrint.fullName || "—"}</p>
          <p>E-post: {lastPrint.email || "—"}</p>
          <p>Telefon: {lastPrint.phone || "—"}</p>
          <p>Studie: {lastPrint.studyProgram || "—"} {lastPrint.studyLevel ? `· ${lastPrint.studyLevel}` : ""} {lastPrint.studyYear ? `· ${lastPrint.studyYear}. år` : ""}</p>
          <p>Bedrift: {lastPrint.companyName || "—"}</p>
          <p>Billett: {lastPrint.ticketNumber}</p>
        </Card>
      ) : null}
    </div>
  );
}
