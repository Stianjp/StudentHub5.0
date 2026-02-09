"use client";

import { useEffect, useMemo, useState } from "react";
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

export function CheckinClient({ eventId }: { eventId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TicketRow[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [printerUrl, setPrinterUrl] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "student" | "company">("all");
  const [activeQuery, setActiveQuery] = useState<string>("");

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

  async function lookupTickets(overrideFilter?: "all" | "student" | "company") {
    if (!query.trim()) return;
    setStatus("loading");
    setMessage(null);
    const activeFilter = overrideFilter ?? filter;
    const response = await fetch(`/api/checkin/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        query: parsedQr?.t ? parsedQr.t : query.trim(),
        mode: parsedQr?.t ? "ticket" : "text",
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
    setResults(payload?.results ?? []);
    setActiveQuery(query.trim());
    setStatus("success");
  }

  async function loadParticipants(nextFilter?: "all" | "student" | "company") {
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
    setStatus("success");
  }

  useEffect(() => {
    void loadParticipants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function handleFilterChange(nextFilter: "all" | "student" | "company") {
    setFilter(nextFilter);
    if (query.trim()) {
      await lookupTickets(nextFilter);
      return;
    }
    await loadParticipants(nextFilter);
  }

  async function clearSearch() {
    setQuery("");
    setActiveQuery("");
    await loadParticipants(filter);
  }

  async function checkinAndPrint(ticketId: string) {
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
      setMessage(payload?.error ?? "Kunne ikke sjekke inn.");
      return;
    }
    const payload = await response.json();
    setResults((prev) => prev.map((row) => (row.id === ticketId ? { ...row, ...payload.ticket } : row)));
    setStatus("success");
    setMessage("Sjekk inn OK.");
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
              placeholder="Ticketnummer, navn, e-post eller telefon. Du kan også lime inn QR JSON."
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
          <div className="flex flex-wrap gap-2 text-sm">
            <Button type="button" variant={filter === "all" ? "primary" : "secondary"} onClick={() => handleFilterChange("all")}>
              Alle
            </Button>
            <Button type="button" variant={filter === "student" ? "primary" : "secondary"} onClick={() => handleFilterChange("student")}>
              Studenter
            </Button>
            <Button type="button" variant={filter === "company" ? "primary" : "secondary"} onClick={() => handleFilterChange("company")}>
              Bedrifter
            </Button>
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
                    <p className="font-semibold text-primary">
                      {ticket.student?.full_name ?? ticket.attendee_name ?? "Ukjent deltaker"}
                    </p>
                    <p className="text-xs text-ink/60">
                      {ticket.student?.email ?? ticket.attendee_email ?? "—"} · {ticket.student?.phone ?? ticket.attendee_phone ?? "—"}
                    </p>
                    <p className="text-xs text-ink/60">
                      {ticket.company?.name ? `Bedrift: ${ticket.company.name}` : ticket.company ? "Bedrift" : ticket.student ? "Student" : "Andre"}
                    </p>
                  </div>
                  <Button type="button" variant="secondary" onClick={() => checkinAndPrint(ticket.id)}>
                    {ticket.checked_in_at ? "Sjekket inn" : "Sjekk inn + print"}
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
    </div>
  );
}
