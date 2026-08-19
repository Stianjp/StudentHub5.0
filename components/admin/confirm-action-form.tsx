"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";

type ConfirmActionFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  label: string;
  confirmMessage: string;
  className?: string;
};

export function ConfirmActionForm({
  action,
  fields,
  label,
  confirmMessage,
  className,
}: ConfirmActionFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(confirmMessage)) event.preventDefault();
  }

  return (
    <form action={action} onSubmit={handleSubmit} className={className}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button type="submit" variant="danger" className="rounded-xl px-4 py-2 text-xs">
        {label}
      </Button>
    </form>
  );
}
