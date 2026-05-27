"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const MAX_WORDS = 250;

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  defaultValue: string;
};

export function RepresentationForm({ action, defaultValue }: Props) {
  const [text, setText] = useState(defaultValue);
  const wordCount = countWords(text);
  const isTooLong = wordCount > MAX_WORDS;

  return (
    <form action={action} className="grid gap-4">
      <label className="text-sm font-semibold text-primary">
        Kort tekst om bedriften
        <p className="mt-1 text-xs font-normal text-surface/78">
          Denne vises på Student Connect-standkartet og i bedriftsoversikten på hovedsiden.
        </p>
        <Textarea
          name="representationText"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={9}
          placeholder="Skriv en kort presentasjon av hvem dere er, hva dere jobber med, og hvorfor studenter bør besøke standen deres."
          className="mt-2"
          aria-invalid={isTooLong}
          aria-describedby="representation-word-count"
        />
      </label>

      <div className="flex flex-col gap-3 text-sm text-surface/78 md:flex-row md:items-center md:justify-between">
        <p
          id="representation-word-count"
          className={isTooLong ? "font-semibold text-error" : undefined}
          aria-live="polite"
        >
          {wordCount}/{MAX_WORDS} ord
        </p>
        <Button type="submit" disabled={isTooLong}>
          Lagre representasjon
        </Button>
      </div>
    </form>
  );
}
