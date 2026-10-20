"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TableRow } from "@/lib/types/database";
import { REGISTRATION_INVOICE_OPTIONS, REGISTRATION_LEVEL_OPTIONS, REGISTRATION_STAND_NEEDS, REGISTRATION_STUDENT_FIELDS } from "@/lib/event-registration-options";
import { useRouter } from "next/navigation";
import { ALL_STUDENT_FIELDS, buildOrder, formatNok, type EventAddon } from "@/lib/event-order";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type RegistrationPackage = TableRow<"event_registration_packages">;

type PublicRegistrationFormProps = {
  slug: string;
  campaign: {
    publicTitle: string;
    publicSubtitle: string | null;
    publicDescription: string | null;
    floorplanImagePath: string | null;
    eventName: string;
  };
  packages: RegistrationPackage[];
  addons?: EventAddon[];
};

type StepKey =
  | "contact"
  | "company"
  | "invoice"
  | "students"
  | "package"
  | "needs"
  | "finish";

const steps: Array<{ key: StepKey; label: string; title: string }> = [
  { key: "contact", label: "1", title: "Contact" },
  { key: "company", label: "2", title: "Company" },
  { key: "invoice", label: "3", title: "Invoice" },
  { key: "students", label: "4", title: "Student audience" },
  { key: "package", label: "5", title: "Package" },
  { key: "needs", label: "6", title: "Add-ons" },
  { key: "finish", label: "7", title: "Review" },
];

function packagePrice(pkg: RegistrationPackage): string | null {
  return pkg.price_ore == null ? null : `${formatNok(pkg.price_ore)} excl. VAT`;
}

function packageLabel(pkg: RegistrationPackage) {
  return pkg.public_name;
}

export function PublicRegistrationForm({
  slug,
  campaign,
  packages,
  addons = [],
}: PublicRegistrationFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const [contactFirstName, setContactFirstName] = useState("");
  const [contactLastName, setContactLastName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactJobTitle, setContactJobTitle] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [orgNumber, setOrgNumber] = useState("");
  const [country, setCountry] = useState("Norway");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [invoiceDeliveryMethod, setInvoiceDeliveryMethod] = useState<"ehf" | "email">("email");
  const [invoiceEmail, setInvoiceEmail] = useState("");
  const [invoiceReference, setInvoiceReference] = useState("");
  const [invoiceDueDays, setInvoiceDueDays] = useState<"14" | "30" | "45" | "other">("30");
  const [invoiceDueDaysOther, setInvoiceDueDaysOther] = useState("");

  const [candidateLevel, setCandidateLevel] = useState<"bachelor" | "master" | "both">("both");
  const [candidateFields, setCandidateFields] = useState<string[]>([]);
  const [candidateFieldsOther, setCandidateFieldsOther] = useState("");

  const [requestedPackageId, setRequestedPackageId] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if(error) errorRef.current?.focus(); }, [error]);
  const router = useRouter();
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({});

  const [standNeeds, setStandNeeds] = useState<string[]>([]);
  const [standNeedsOther, setStandNeedsOther] = useState("");
  const [notes, setNotes] = useState("");
  const [portalEmails, setPortalEmails] = useState<string[]>(["", "", "", "", ""]);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const selectedPackage = useMemo(
    () => packages.find((pkg) => pkg.id === requestedPackageId) ?? null,
    [packages, requestedPackageId],
  );

  const order = useMemo(() => {
    if (!selectedPackage) return null;
    try { return buildOrder(selectedPackage, addons, addonQuantities); } catch { return null; }
  }, [selectedPackage, addons, addonQuantities]);

  useEffect(() => {
    setPortalEmails((current) => {
      if (current[0]) return current;
      if (!contactEmail) return current;
      return [contactEmail, ...current.slice(1)];
    });
  }, [contactEmail]);

  function toggleListValue(value: string, values: string[], setter: (next: string[]) => void) {
    if (values.includes(value)) {
      setter(values.filter((item) => item !== value));
      return;
    }
    setter([...values, value]);
  }

  function updatePortalEmail(index: number, value: string) {
    setPortalEmails((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }

  function validateStep(stepIndex: number) {
    if (stepIndex === 0) {
      if (!contactFirstName || !contactLastName || !contactEmail || !contactPhone) {
        return "Complete all contact fields before continuing.";
      }
    }
    if (stepIndex === 1) {
      if (!companyName || !orgNumber || !country || !address || !city || !postalCode) {
        return "Complete all company fields before continuing.";
      }
      if (!/^\d{9}$/.test(orgNumber.replace(/\s+/g, ""))) {
        return "Org. number must be 9 digits.";
      }
    }
    if (stepIndex === 2 && invoiceDeliveryMethod === "email" && !invoiceEmail) {
      return "Add the invoice email before continuing.";
    }
    if (stepIndex === 2 && invoiceDueDays === "other" && !invoiceDueDaysOther.trim()) {
      return "Specify the preferred payment terms before continuing.";
    }
    if (stepIndex === 3 && candidateFields.length === 0) {
      return "Choose at least one student field.";
    }
    if (stepIndex === 4 && !requestedPackageId) {
      return "Choose a package before continuing.";
    }
    if (stepIndex === 3 && candidateFields.includes("Other") && !candidateFieldsOther.trim()) return "Describe the other study field.";
    if (stepIndex >= 4 && !order) return "Choose an available package and valid add-on quantities.";
    if (stepIndex === 6) {
      const cleanedEmails = portalEmails.map((value) => value.trim()).filter(Boolean);
      if (cleanedEmails.length === 0) {
        return "Add at least one portal email before submitting.";
      }
      if (new Set(cleanedEmails).size !== cleanedEmails.length) {
        return "Portal emails must be unique.";
      }
    }
    return null;
  }

  function goNext() {
    const stepError = validateStep(currentStep);
    if (stepError) {
      setError(stepError);
      return;
    }
    setError(null);
    setCurrentStep((value) => Math.min(value + 1, steps.length - 1));
  }

  function goBack() {
    setError(null);
    setCurrentStep((value) => Math.max(value - 1, 0));
  }

  async function handleSubmit() {
    const stepError = validateStep(steps.length - 1);
    if (stepError) {
      setError(stepError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("contactFirstName", contactFirstName);
      formData.append("contactLastName", contactLastName);
      formData.append("contactEmail", contactEmail);
      formData.append("contactPhone", contactPhone);
      formData.append("contactJobTitle", contactJobTitle);
      formData.append("companyName", companyName);
      formData.append("orgNumber", orgNumber.replace(/\s+/g, ""));
      formData.append("country", country);
      formData.append("address", address);
      formData.append("city", city);
      formData.append("postalCode", postalCode);
      formData.append("invoiceDeliveryMethod", invoiceDeliveryMethod);
      formData.append("invoiceEmail", invoiceEmail);
      formData.append("invoiceReference", invoiceReference);
      formData.append("invoiceDueDays", invoiceDueDays);
      formData.append("invoiceDueDaysOther", invoiceDueDaysOther);
      formData.append("candidateLevel", candidateLevel);
      formData.append("candidateFieldsOther", candidateFieldsOther);
      formData.append("requestedPackageId", requestedPackageId);
      formData.append("addonQuantities", JSON.stringify(addonQuantities));
      formData.append("orderQuote", JSON.stringify(order));
      formData.append("standNeedsOther", standNeedsOther);
      formData.append("notes", notes);

      candidateFields.forEach((field) => formData.append("candidateFields", field));
      standNeeds.forEach((need) => formData.append("standNeeds", need));
      portalEmails
        .map((value) => value.trim())
        .filter(Boolean)
        .forEach((value) => formData.append("portalEmails", value));

      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const response = await fetch(`/api/event-register/campaigns/${slug}/applications`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; id?: string; error?: string }
        | null;

      if (!response.ok || !payload?.ok || !payload.id) {
        if (payload?.error?.includes("Prices changed")) router.refresh();
        throw new Error(payload?.error ?? "Could not submit the registration.");
      }

      setSubmittedId(payload.id);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit the registration.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedId) {
    return (
      <Card className="border border-success/30 bg-surface/95">
        <div className="grid gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">Registration received</p>
          <h2 className="text-3xl font-bold text-primary">Thanks, your application is in.</h2>
          <p className="max-w-2xl text-sm text-ink/75">
            OSH will review the registration before package, stand and portal access are confirmed.
            Your application reference is <span className="font-semibold text-primary">{submittedId}</span>.
          </p>
          <p className="text-sm text-ink/75">
            The contact person will be your primary follow-up, and the portal emails will receive access only after approval.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="grid gap-6 bg-white shadow-md ring-1 ring-gray-200">
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            {steps.map((step, index) => (
              <button
                key={step.key}
                type="button"
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition",
                  index === currentStep
                    ? "border-[#FE9A70] bg-[#FE9A70] text-[#140249]"
                    : "border-gray-300 bg-white text-gray-700 hover:border-[#FE9A70] hover:text-[#140249]",
                )}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#140249]/10 text-[11px] text-[#140249]">
                  {step.label}
                </span>
                <span>{step.title}</span>
              </button>
            ))}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#6d28d9]">
              {campaign.eventName}
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-[#140249]">{campaign.publicTitle}</h2>
            {campaign.publicSubtitle ? (
              <p className="mt-2 text-lg font-semibold text-[#140249]/80">{campaign.publicSubtitle}</p>
            ) : null}
            {campaign.publicDescription ? (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#1A1626]">{campaign.publicDescription}</p>
            ) : null}
          </div>
        </div>

        {currentStep === 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <p className="text-lg font-bold text-[#140249] md:col-span-2">First let us know who you are</p>
            <label className="text-sm font-semibold text-primary">
              First name
              <Input value={contactFirstName} onChange={(event) => setContactFirstName(event.target.value)} />
            </label>
            <label className="text-sm font-semibold text-primary">
              Last name
              <Input value={contactLastName} onChange={(event) => setContactLastName(event.target.value)} />
            </label>
            <label className="text-sm font-semibold text-primary md:col-span-2">
              E-mail
              <Input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
            </label>
            <label className="text-sm font-semibold text-primary">
              Phone number
              <Input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} />
            </label>
            <label className="text-sm font-semibold text-primary">
              Job title
              <Input value={contactJobTitle} onChange={(event) => setContactJobTitle(event.target.value)} />
            </label>
          </div>
        ) : null}

        {currentStep === 1 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-primary md:col-span-2">
              Company name
              <Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
            </label>
            <label className="text-sm font-semibold text-primary">
              MVA-ID
              <Input value={orgNumber} onChange={(event) => setOrgNumber(event.target.value)} placeholder="123456789" />
            </label>
            <label className="text-sm font-semibold text-primary">
              Country / Region
              <Input value={country} onChange={(event) => setCountry(event.target.value)} />
            </label>
            <label className="text-sm font-semibold text-primary md:col-span-2">
              Address
              <Textarea
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                rows={3}
                placeholder={"Street address\nAddress line 2 (optional)"}
              />
            </label>
            <label className="text-sm font-semibold text-primary">
              City
              <Input value={city} onChange={(event) => setCity(event.target.value)} />
            </label>
            <label className="text-sm font-semibold text-primary">
              Zip / Postal code
              <Input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} />
            </label>
          </div>
        ) : null}

        {currentStep === 2 ? (
          <div className="grid gap-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {REGISTRATION_INVOICE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setInvoiceDeliveryMethod(option.value)}
                  className={cn(
                    "rounded-2xl border px-4 py-4 text-left transition",
                    invoiceDeliveryMethod === option.value
                      ? "border-[#FE9A70] bg-[#FE9A70]/15 shadow-sm"
                      : "border-gray-300 bg-white hover:border-[#FE9A70]",
                  )}
                >
                  <p className="text-sm font-semibold text-primary">{option.label}</p>
                  <p className="mt-1 text-xs text-ink/65">
                    {option.value === "ehf" ? "Use EHF billing to the org. number." : "Send the invoice to a finance mailbox."}
                  </p>
                </button>
              ))}
            </div>
            {invoiceDeliveryMethod === "email" ? (
              <label className="text-sm font-semibold text-primary">
                Invoice e-mail
                <Input
                  type="email"
                  value={invoiceEmail}
                  onChange={(event) => setInvoiceEmail(event.target.value)}
                  placeholder="invoice@company.no"
                />
              </label>
            ) : null}
            <label className="text-sm font-semibold text-primary">
              Invoice reference
              <Input
                value={invoiceReference}
                onChange={(event) => setInvoiceReference(event.target.value)}
                placeholder="Purchase order, project code or other note"
              />
            </label>
            <div className="grid gap-3">
              <p className="text-sm font-semibold text-primary">Payment terms</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { value: "14", label: "14 days" },
                  { value: "30", label: "30 days" },
                  { value: "45", label: "45 days" },
                  { value: "other", label: "Other - specify" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setInvoiceDueDays(option.value as "14" | "30" | "45" | "other")}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
                      invoiceDueDays === option.value
                        ? "border-[#FE9A70] bg-[#FE9A70]/15 text-[#140249] shadow-sm"
                        : "border-gray-300 bg-white text-gray-700 hover:border-[#FE9A70]",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {invoiceDueDays === "other" ? (
                <label className="text-sm font-semibold text-primary">
                  Specify payment terms
                  <Input
                    value={invoiceDueDaysOther}
                    onChange={(event) => setInvoiceDueDaysOther(event.target.value)}
                    placeholder="Example: 60 days or by agreement"
                  />
                </label>
              ) : null}
            </div>
          </div>
        ) : null}

        {currentStep === 3 ? (
          <div className="grid gap-5">
            <h2 className="text-xl font-bold">Which students would you like to meet?</h2>
            <p>Select the study fields you recruit from, regardless of your company’s industry. OSH uses your answers to group companies: one field suggests a subject area; several fields suggest the shared area. OSH assigns your final location.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {REGISTRATION_LEVEL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={candidateLevel === option.value}
                  onClick={() => setCandidateLevel(option.value)}
                  className={cn(
                    "rounded-2xl border px-4 py-4 text-left transition",
                    candidateLevel === option.value
                      ? "border-[#FE9A70] bg-[#FE9A70]/15 shadow-sm"
                      : "border-gray-300 bg-white hover:border-[#FE9A70]",
                  )}
                >
                  <span className="text-sm font-semibold text-primary">{option.label}</span>
                </button>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {[ALL_STUDENT_FIELDS, ...REGISTRATION_STUDENT_FIELDS].map((field) => (
                <label
                  key={field}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition",
                    candidateFields.includes(field)
                      ? "border-[#FE9A70] bg-[#FE9A70]/15"
                      : "border-gray-300 bg-white hover:border-[#FE9A70]",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={candidateFields.includes(field)}
                    onChange={() => {
                      if (field === ALL_STUDENT_FIELDS) setCandidateFields(candidateFields.includes(field) ? [] : [field]);
                      else toggleListValue(field, candidateFields.filter(f => f !== ALL_STUDENT_FIELDS), setCandidateFields);
                    }}
                    className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-secondary"
                  />
                  <span className="font-semibold text-primary">{field}</span>
                </label>
              ))}
            </div>
            {candidateFields.includes("Other") ? (
              <label className="text-sm font-semibold text-primary">
                Other field
                <Input
                  value={candidateFieldsOther}
                  onChange={(event) => setCandidateFieldsOther(event.target.value)}
                  placeholder="Describe the field you are looking for"
                />
              </label>
            ) : null}
          </div>
        ) : null}

        {currentStep === 4 ? (
          <div className="grid gap-4">
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                aria-pressed={requestedPackageId === pkg.id}
                onClick={() => setRequestedPackageId(pkg.id)}
                className={cn(
                  "rounded-3xl border px-5 py-5 text-left transition",
                  requestedPackageId === pkg.id
                    ? "border-[#FE9A70] bg-[#FE9A70]/15 shadow-sm"
                    : "border-gray-300 bg-white hover:border-[#FE9A70]",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#140249]">{packageLabel(pkg)}</h3>
                    {pkg.description ? (
                      <p className="mt-1 text-sm text-[#1A1626]/70">{pkg.description}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {packagePrice(pkg) ? (
                      <span className="text-base font-extrabold text-[#140249]">{packagePrice(pkg)}</span>
                    ) : null}
                    <span className="rounded-full bg-[#140249]/8 px-3 py-1 text-xs font-semibold text-[#140249]/60">
                      {pkg.mapped_package ? pkg.mapped_package.toUpperCase() : "FOLLOW UP"}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : null}

        {currentStep === 5 ? (
          <div className="grid gap-5">
            <h2 className="text-xl font-bold">Included items and optional extras</h2>
            <p>Choose quantities in addition to what your package includes. Prices exclude VAT.</p>
            {order?.lines.map(line => {
              const available = addons.find(a => a.id === line.id)?.is_active;
              return <label key={line.id} className="grid gap-2 rounded-xl border border-gray-300 p-4 font-semibold">
                {line.name} — {line.included} included
                {available ? <><span className="text-sm">{formatNok(line.unitPriceOre)} per {line.unit} extra</span>
                <Input aria-label={`Extra ${line.name}`} type="number" min={0} max={10000} step={1} value={addonQuantities[line.id] ?? 0}
                  onChange={e => setAddonQuantities(current => ({ ...current, [line.id]: Math.min(10000, Math.max(0, Math.floor(Number(e.target.value) || 0))) }))} /></> : <span className="text-sm">Included in your package. Extra units are not on sale yet.</span>}
              </label>;
            })}
            {!order?.lines.length ? <p>No add-ons are available yet.</p> : null}
            <div className="grid gap-2 sm:grid-cols-2">
              {REGISTRATION_STAND_NEEDS.filter(need => need !== "Tables").map((need) => (
                <label
                  key={need}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition",
                    standNeeds.includes(need)
                      ? "border-[#FE9A70] bg-[#FE9A70]/15"
                      : "border-gray-300 bg-white hover:border-[#FE9A70]",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={standNeeds.includes(need)}
                    onChange={() => toggleListValue(need, standNeeds, setStandNeeds)}
                    className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-secondary"
                  />
                  <span className="font-semibold text-primary">{need}</span>
                </label>
              ))}
            </div>
            {standNeeds.includes("Other") ? (
              <label className="text-sm font-semibold text-primary">
                Other stand request
                <Input
                  value={standNeedsOther}
                  onChange={(event) => setStandNeedsOther(event.target.value)}
                  placeholder="Describe anything else you need at the stand"
                />
              </label>
            ) : null}
          </div>
        ) : null}

        {currentStep === 6 ? (
          <div className="grid gap-5">
            <label className="text-sm font-semibold text-primary">
              Anything else in mind?
              <Textarea
                rows={5}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Write any extra context, practical needs or follow-up requests"
              />
            </label>

            <label className="text-sm font-semibold text-primary">
              Company logo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                className="mt-2 block w-full rounded-2xl border border-primary/15 bg-surface px-4 py-4 text-sm text-ink"
              />
              <span className="mt-2 block text-xs text-ink/60">Optional. Max 6 MB.</span>
            </label>

            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-primary">Portal access e-mails</p>
                  <p className="text-xs text-ink/65">Up to 5 people can get access after OSH approval.</p>
                </div>
                <button
                  type="button"
                  onClick={() => updatePortalEmail(0, contactEmail)}
                  className="text-xs font-semibold text-primary/70 hover:text-primary"
                >
                  Use contact e-mail
                </button>
              </div>
              <div className="grid gap-3">
                {portalEmails.map((value, index) => (
                  <label key={`portal-email-${index}`} className="text-sm font-semibold">Portal e-mail {index+1}
                  <Input
                    type="email"
                    value={value}
                    onChange={(event) => updatePortalEmail(index, event.target.value)}
                    placeholder={`Portal e-mail ${index + 1}`}
                  /></label>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={goBack} disabled={currentStep === 0 || submitting}>
            Back
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button type="button" onClick={goNext}>
              Next
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Send application"}
            </Button>
          )}
        </div>
      </Card>

      <div className="grid gap-4 xl:sticky xl:top-8 xl:self-start">
        <Card className="bg-[#140249] text-white shadow-md">
          <p className="text-xs font-bold uppercase tracking-widest text-white/80">Application summary</p>
          <div className="mt-4 grid gap-4 text-sm">
            <div>
              <p className="text-white/78">Contact</p>
              <p className="font-semibold text-white">
                {[contactFirstName, contactLastName].filter(Boolean).join(" ") || "Not filled in"}
              </p>
            </div>
            <div>
              <p className="text-white/78">Company</p>
              <p className="font-semibold text-white">{companyName || "Not filled in"}</p>
            </div>
            <div>
              <p className="text-white/78">Package</p>
              <p className="font-semibold text-white">{selectedPackage ? selectedPackage.public_name : "Not selected"}</p>
            </div>
            <div>
              <p className="text-white/78">Student audience</p>
              <p className="font-semibold text-white">
                {candidateFields.join(", ") || "Not selected"}{candidateFieldsOther ? `: ${candidateFieldsOther}` : ""}
              </p>
            </div>
            {order ? <div aria-live="polite" className="grid gap-2">
              <p>Package: {formatNok(order.packagePriceOre)}</p>
              {order.lines.filter(line => line.included || line.extra).map(line => <p key={line.id}>{line.name}: {line.included} included + {line.extra} extra — {formatNok(line.extra * line.unitPriceOre)}</p>)}
              <p className="text-lg font-bold">Total: {formatNok(order.totalOre)} excl. VAT</p>
              <p>Subject to OSH approval. Invoiced after approval.</p>
            </div> : null}
            <div>
              <p className="text-white/78">Portal emails</p>
              <p className="font-semibold text-white">
                {portalEmails.map((value) => value.trim()).filter(Boolean).length} of 5 added
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-white shadow-md ring-1 ring-gray-200">
          <p className="text-sm font-bold text-[#140249]">What happens next?</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[#1A1626]">
            <li>You submit the event application.</li>
            <li>OSH reviews your order and assigns an area and stand.</li>
            <li>Approved portal users receive access after OSH approval.</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
