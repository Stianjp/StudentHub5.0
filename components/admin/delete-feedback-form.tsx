"use client";

type DeleteFeedbackFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  formId: string;
  returnTo: string;
  title: string;
};

export function DeleteFeedbackForm({ action, formId, returnTo, title }: DeleteFeedbackFormProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Slette skjemaet "${title}"? Dette kan ikke angres.`)) {
          event.preventDefault();
        }
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="formId" value={formId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <p className="text-sm leading-6 text-primary/70">
        Skjemaet blir fjernet permanent sammen med spørsmål og svar.
      </p>
      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-error/25 bg-error px-5 py-3 text-sm font-bold text-surface transition hover:-translate-y-0.5 hover:bg-error/90"
        >
          Slett skjema
        </button>
      </div>
    </form>
  );
}
