"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import { cn } from "@/lib/utils";

type SubmitState = "idle" | "submitting" | "success" | "error";

const EVENT_OPTIONS = [
  "Company presentation",
  "Social event with students",
  "Help to promote for students",
  "Other",
] as const;

export function PartnerInquiryForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedOption, setSelectedOption] =
    useState<(typeof EVENT_OPTIONS)[number]>("Company presentation");
  const [otherOption, setOtherOption] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState("");

  const selectedLabel = useMemo(() => {
    if (selectedOption !== "Other") return selectedOption;
    return otherOption.trim() || "Other";
  }, [otherOption, selectedOption]);

  function goNext() {
    if (selectedOption === "Other" && !otherOption.trim()) {
      setError("Please specify the event type before continuing.");
      return;
    }
    setError("");
    setStep(2);
    if (!details.trim()) {
      setDetails(selectedLabel);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setError("");

    try {
      const response = await fetch("/api/public/partner-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: selectedOption,
          eventTypeOther: otherOption,
          name,
          companyName,
          email,
          phone,
          details,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Could not send the inquiry.");
      }

      setState("success");
      setStep(1);
      setSelectedOption("Company presentation");
      setOtherOption("");
      setName("");
      setCompanyName("");
      setEmail("");
      setPhone("");
      setDetails("");
    } catch (submitError) {
      setState("error");
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not send the inquiry.",
      );
    }
  }

  return (
    <div className="mt-8 space-y-4 rounded-2xl bg-mist/40 p-8 ring-1 ring-primary/5">
      {step === 1 ? (
        <>
          <p className="text-sm font-semibold text-primary">
            What type of event are you interested in?
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {EVENT_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSelectedOption(option)}
                className={cn(
                  "rounded-xl px-4 py-3 text-left text-sm ring-1 transition",
                  selectedOption === option
                    ? "bg-primary text-surface ring-primary"
                    : "bg-surface text-ink/80 ring-primary/5 hover:ring-primary/20",
                )}
              >
                {option}
              </button>
            ))}
          </div>
          {selectedOption === "Other" ? (
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink/60">
                Please specify
              </label>
              <input
                type="text"
                required
                value={otherOption}
                onChange={(event) => setOtherOption(event.target.value)}
                placeholder="Tell us what kind of event you want"
                className="w-full rounded-xl border border-primary/10 bg-surface px-4 py-2.5 text-sm text-ink/80 placeholder:text-ink/30"
              />
            </div>
          ) : null}
          <button
            type="button"
            onClick={goNext}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-surface"
          >
            Next
            <ArrowRight size={14} />
          </button>
        </>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <p className="text-sm font-semibold text-primary">
            Event type: {selectedLabel}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
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
                Company name
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Your company"
                className="w-full rounded-xl border border-primary/10 bg-surface px-4 py-2.5 text-sm text-ink/80 placeholder:text-ink/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink/60">
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
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
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink/60">
              What would you like from us?
            </label>
            <textarea
              required
              rows={4}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Tell us what you want help with"
              className="w-full rounded-xl border border-primary/10 bg-surface px-4 py-2.5 text-sm text-ink/80 placeholder:text-ink/30"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setError("");
                setStep(1);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 px-6 py-2.5 text-sm font-bold text-primary"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <button
              type="submit"
              disabled={state === "submitting"}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-surface transition disabled:opacity-60"
            >
              <Send size={14} />
              {state === "submitting" ? "Sending..." : "Submit"}
            </button>
          </div>
        </form>
      )}
      {state === "success" ? (
        <p className="text-xs text-success">
          Your inquiry has been sent to Amruta and Stian.
        </p>
      ) : null}
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}
