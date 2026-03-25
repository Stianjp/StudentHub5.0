import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { requireRole } from "@/lib/auth";
import { getGmailFeasibilitySummary } from "@/lib/gmail-feasibility";
import { GmailFeasibilityRunForm } from "./run-form";

export default async function AdminCrmGmailFeasibilityPage() {
  await requireRole("admin");
  const summary = getGmailFeasibilitySummary();

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="CRM / Gmail"
        title="Gmail Feasibility"
        description="Avklar om OSH kan lese og sende e-post som testkontoen via Gmail API og domain-wide delegation. Standard testbruker er stian@oslostudenthub.no til salg@ er klar."
        actions={
          <Link
            className="inline-flex items-center justify-center rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary transition hover:border-secondary hover:bg-secondary/10 hover:text-secondary"
            href="/admin/crm"
          >
            Tilbake til CRM
          </Link>
        }
      />

      <Card className="grid gap-3">
        <p className="text-sm font-semibold text-primary">Konfigurasjon</p>
        <div className="grid gap-2 text-sm text-ink/80 md:grid-cols-2">
          <p><span className="font-semibold text-primary">Delegert bruker:</span> {summary.delegatedUser ?? "Ikke satt"}</p>
          <p><span className="font-semibold text-primary">Testmottaker:</span> {summary.testRecipient ?? "Ikke satt"}</p>
          <p><span className="font-semibold text-primary">Status:</span> {summary.configured ? "Klar for test" : "Mangler konfigurasjon"}</p>
          <p><span className="font-semibold text-primary">Manglende env:</span> {summary.missingConfig.join(", ") || "Ingen"}</p>
        </div>
      </Card>

      <GmailFeasibilityRunForm
        delegatedUser={summary.delegatedUser}
        testRecipient={summary.testRecipient}
      />
    </div>
  );
}
