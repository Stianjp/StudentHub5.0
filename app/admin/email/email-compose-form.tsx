"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { sendEmailAction } from "./actions";

type Template = {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  variables: string[];
  is_active: boolean;
};

type Group = {
  id: string;
  name: string;
  member_type: "company" | "student";
  memberCount: number;
};

type Props = {
  templates: Template[];
  groups: Group[];
};

type ActionState = {
  sent?: number;
  failed?: number;
  skipped?: number;
  error?: string;
} | null;

export function EmailComposeForm({ templates, groups }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    sendEmailAction,
    null
  );

  const [selectedTemplateId, setSelectedTemplateId] = React.useState("");
  const [recipientMode, setRecipientMode] = React.useState<"group" | "custom">("group");
  const [previewHtml, setPreviewHtml] = React.useState<string | null>(null);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;

  function handleTemplateChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedTemplateId(e.target.value);
    setPreviewHtml(null);
  }

  function handlePreview() {
    const body = selectedTemplate?.html_body ?? "";
    setPreviewHtml(body || "<p><em>Ingen innhold å forhåndsvise.</em></p>");
  }

  return (
    <div className="flex flex-col gap-6">
      {state?.error && (
        <Card className="border border-error/30 bg-error/10 text-sm">
          <p className="font-semibold text-error">Feil</p>
          <p className="mt-1">{state.error}</p>
        </Card>
      )}

      {state && !state.error && (
        <Card className="border border-success/30 bg-success/10 text-sm">
          <p className="font-semibold text-success">E-post sendt!</p>
          <p className="mt-1">
            Sendt: {state.sent ?? 0} &middot; Feilet: {state.failed ?? 0} &middot; Hoppet over: {state.skipped ?? 0}
          </p>
        </Card>
      )}

      <form action={formAction} className="flex flex-col gap-6">
        <Card>
          <p className="text-sm font-semibold text-primary mb-4">Velg mal</p>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink/70" htmlFor="template_id">Mal (valgfritt)</label>
              <Select
                id="template_id"
                name="template_id"
                value={selectedTemplateId}
                onChange={handleTemplateChange}
              >
                <option value="">Ingen mal – skriv manuelt</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </div>

            {selectedTemplate && (
              <div className="rounded-xl border border-primary/10 bg-surface p-4 text-sm">
                <p className="text-xs font-semibold text-ink/60 mb-1">Emne fra mal:</p>
                <p className="text-ink">{selectedTemplate.subject}</p>
                {selectedTemplate.variables.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="text-xs text-ink/60">Variabler:</span>
                    {selectedTemplate.variables.map((v) => (
                      <span key={v} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-mono text-primary">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handlePreview}
                  className="mt-3 text-xs text-primary underline"
                >
                  Forhåndsvis mal
                </button>
              </div>
            )}

            {previewHtml && (
              <div className="rounded-xl border border-primary/20 bg-white p-4">
                <p className="text-xs font-semibold text-ink/60 mb-2">Forhåndsvisning:</p>
                <div
                  className="text-sm prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            )}
          </div>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-primary mb-4">Emne og innhold</p>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink/70" htmlFor="subject">
                Emne {selectedTemplate ? "(overstyr mal)" : "(påkrevd)"}
              </label>
              <Input
                id="subject"
                name="subject"
                placeholder={selectedTemplate?.subject ?? "Emne for e-posten"}
                required={!selectedTemplate}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink/70" htmlFor="html_body">
                HTML-innhold {selectedTemplate ? "(overstyr mal)" : "(påkrevd)"}
              </label>
              <textarea
                id="html_body"
                name="html_body"
                rows={8}
                required={!selectedTemplate}
                className="rounded-xl border border-primary/20 bg-surface px-4 py-3 text-sm font-mono text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={
                  selectedTemplate
                    ? "La stå tom for å bruke mal-innholdet"
                    : "<p>Hei {{displayName}},</p><p>Din melding her.</p>"
                }
              />
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-primary mb-4">Mottakere</p>
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="recipient_mode"
                  value="group"
                  checked={recipientMode === "group"}
                  onChange={() => setRecipientMode("group")}
                />
                Gruppe
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="recipient_mode"
                  value="custom"
                  checked={recipientMode === "custom"}
                  onChange={() => setRecipientMode("custom")}
                />
                Egendefinerte e-poster
              </label>
            </div>

            {recipientMode === "group" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink/70" htmlFor="group_id">Velg gruppe</label>
                <Select id="group_id" name="group_id" required>
                  <option value="">Velg gruppe...</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.memberCount} {g.member_type === "company" ? "bedrifter" : "studenter"})
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {recipientMode === "custom" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink/70" htmlFor="custom_emails">
                  E-postadresser (én per linje eller kommaseparert)
                </label>
                <textarea
                  id="custom_emails"
                  name="custom_emails"
                  rows={5}
                  required
                  className="rounded-xl border border-primary/20 bg-surface px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder={"kontakt@bedrift.no\nstudent@uni.no"}
                />
              </div>
            )}
          </div>
        </Card>

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Sender..." : "Send e-post"}
        </Button>
      </form>
    </div>
  );
}

// Need to import React for useState
import React from "react";
