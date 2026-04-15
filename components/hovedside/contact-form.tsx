"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Send } from "lucide-react";

type SubmitState = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setError("");

    try {
      const response = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, message }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Could not send your message.");
      }

      setState("success");
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (submitError) {
      setState("error");
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not send your message.",
      );
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="mb-1 block text-xs font-semibold text-ink/60">
          Name
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          className="w-full rounded-xl border border-primary/10 bg-surface px-4 py-2.5 text-sm text-ink/80 placeholder:text-ink/30"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-ink/60">
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="your@email.com"
          className="w-full rounded-xl border border-primary/10 bg-surface px-4 py-2.5 text-sm text-ink/80 placeholder:text-ink/30"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-ink/60">
          Phone number
        </label>
        <input
          type="tel"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+47 123 45 678"
          className="w-full rounded-xl border border-primary/10 bg-surface px-4 py-2.5 text-sm text-ink/80 placeholder:text-ink/30"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-ink/60">
          Message
        </label>
        <textarea
          required
          rows={4}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Your message..."
          className="w-full rounded-xl border border-primary/10 bg-surface px-4 py-2.5 text-sm text-ink/80 placeholder:text-ink/30"
        />
      </div>
      <button
        type="submit"
        disabled={state === "submitting"}
        className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-surface transition disabled:opacity-60"
      >
        <Send size={14} />
        {state === "submitting" ? "Sending..." : "Send message"}
      </button>
      {state === "success" ? (
        <p className="text-xs text-success">
          Your message has been sent to support@oslostudenthub.no.
        </p>
      ) : null}
      {state === "error" ? (
        <p className="text-xs text-error">{error}</p>
      ) : null}
    </form>
  );
}
