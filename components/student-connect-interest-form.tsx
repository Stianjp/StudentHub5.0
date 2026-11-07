"use client";

import { useState, type FormEvent } from "react";

export function StudentConnectInterestForm() {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    try {
      const response = await fetch("/api/public/student-connect-2027-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, email, consent }),
      });
      if (!response.ok) throw new Error("Could not save your request.");
      setState("success");
      setCompanyName("");
      setEmail("");
      setConsent(false);
    } catch {
      setState("error");
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-[#140249]">
          Company name
          <input name="companyName" autoComplete="organization" required maxLength={160} value={companyName} onChange={(event) => setCompanyName(event.target.value)} className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900" />
        </label>
        <label className="block text-sm font-semibold text-[#140249]">
          E-mail
          <input name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900" />
        </label>
      </div>
      <label className="flex items-start gap-3 text-sm text-[#1A1626]">
        <input name="consent" type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 size-4" />
        <span>I agree to be contacted by Oslo Student Hub by e-mail when registration for Student Connect 2027 opens.</span>
      </label>
      <button disabled={state === "submitting"} type="submit" className="rounded-full bg-[#140249] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
        {state === "submitting" ? "Saving..." : "Notify me"}
      </button>
      {state === "success" ? <p role="status" className="text-sm text-green-700">Thank you. We will contact you when registration opens.</p> : null}
      {state === "error" ? <p role="alert" className="text-sm text-red-700">We could not save your request. Please try again or email event@oslostudenthub.no.</p> : null}
    </form>
  );
}
