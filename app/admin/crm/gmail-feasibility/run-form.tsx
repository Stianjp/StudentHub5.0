"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { GmailFeasibilityResult } from "@/lib/gmail-feasibility";
import { runGmailFeasibilityAction } from "./actions";

type Props = {
  delegatedUser: string | null;
  testRecipient: string | null;
};

export function GmailFeasibilityRunForm({ delegatedUser, testRecipient }: Props) {
  const [state, formAction, pending] = useActionState<GmailFeasibilityResult | null, FormData>(
    runGmailFeasibilityAction,
    null,
  );

  return (
    <div className="grid gap-4">
      <Card className="grid gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">Kjør Gmail-feasibility</p>
          <p className="mt-1 text-sm text-ink/70">
            Leser de siste trådene i <strong>{delegatedUser ?? "ikke konfigurert"}</strong> og sender én testmail til{" "}
            <strong>{testRecipient ?? "ikke konfigurert"}</strong>.
          </p>
        </div>
        <form action={formAction}>
          <Button type="submit" disabled={pending}>
            {pending ? "Kjører..." : "Kjør Gmail-test"}
          </Button>
        </form>
      </Card>

      {state ? (
        <Card className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">Resultat</p>
              <p className="text-sm text-ink/70">Go/no-go for Gmail API med delegert tilgang.</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                state.goNoGo === "go" ? "bg-success/15 text-success" : "bg-error/15 text-error"
              }`}
            >
              {state.goNoGo.toUpperCase()}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm text-ink/80">
              <p className="font-semibold text-primary">Les tråder</p>
              <p className="mt-1">{state.readThreads.ok ? `${state.readThreads.count ?? 0} tråder tilgjengelig` : "Feilet"}</p>
              {state.readThreads.threadIds?.length ? (
                <p className="mt-2 break-all text-xs text-ink/60">{state.readThreads.threadIds.join(", ")}</p>
              ) : null}
              {state.readThreads.error ? <p className="mt-2 text-xs text-error">{state.readThreads.error}</p> : null}
            </div>
            <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm text-ink/80">
              <p className="font-semibold text-primary">Send testmail</p>
              <p className="mt-1">{state.sendMail.ok ? `Sendt til ${state.testRecipient}` : "Feilet"}</p>
              {state.sendMail.messageId ? <p className="mt-2 break-all text-xs text-ink/60">{state.sendMail.messageId}</p> : null}
              {state.sendMail.error ? <p className="mt-2 text-xs text-error">{state.sendMail.error}</p> : null}
            </div>
          </div>

          {state.missingConfig.length > 0 ? (
            <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-ink/80">
              <p className="font-semibold text-primary">Manglende konfigurasjon</p>
              <p className="mt-1">{state.missingConfig.join(", ")}</p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm text-ink/80">
            <p className="font-semibold text-primary">Notater</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {state.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
