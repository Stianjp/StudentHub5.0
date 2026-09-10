"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  createGalaDinnerAttendeeAction,
  updateGalaDinnerAttendeeAction,
} from "@/app/admin/crm/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  INITIAL_GALA_DINNER_ACTION_STATE,
  type GalaDinnerActionState,
} from "@/lib/gala-dinner";

type GalaDinnerAttendeeFormProps = {
  membershipId: string;
  attendeeId?: string;
  defaultFullName?: string;
  defaultAllergens?: string | null;
};

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "Lagrer ..." : isEditing ? "Lagre endringer" : "Legg til deltaker"}
    </Button>
  );
}

export function GalaDinnerAttendeeForm({
  membershipId,
  attendeeId,
  defaultFullName = "",
  defaultAllergens = "",
}: GalaDinnerAttendeeFormProps) {
  const action = attendeeId ? updateGalaDinnerAttendeeAction : createGalaDinnerAttendeeAction;
  const [state, formAction] = useActionState<GalaDinnerActionState, FormData>(
    action,
    INITIAL_GALA_DINNER_ACTION_STATE,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();
  const nameErrorId = state.fieldErrors?.fullName ? `${id}-name-error` : undefined;
  const allergensErrorId = state.fieldErrors?.allergens ? `${id}-allergens-error` : undefined;

  useEffect(() => {
    if (state.status === "success" && !attendeeId) formRef.current?.reset();
  }, [attendeeId, state.status]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      <input type="hidden" name="membershipId" value={membershipId} />
      {attendeeId ? <input type="hidden" name="attendeeId" value={attendeeId} /> : null}

      <label className="text-sm font-semibold text-primary">
        Navn
        <Input
          name="fullName"
          defaultValue={defaultFullName}
          required
          maxLength={120}
          autoComplete="name"
          aria-invalid={Boolean(state.fieldErrors?.fullName)}
          aria-describedby={nameErrorId}
        />
      </label>
      {state.fieldErrors?.fullName ? (
        <p id={nameErrorId} className="-mt-2 text-sm font-semibold text-red-800">
          {state.fieldErrors.fullName}
        </p>
      ) : null}

      <label className="text-sm font-semibold text-primary">
        Allergener
        <Textarea
          name="allergens"
          defaultValue={defaultAllergens ?? ""}
          maxLength={500}
          rows={attendeeId ? 2 : 3}
          placeholder="Valgfritt, for eksempel peanøtter eller gluten"
          aria-invalid={Boolean(state.fieldErrors?.allergens)}
          aria-describedby={allergensErrorId}
        />
      </label>
      {state.fieldErrors?.allergens ? (
        <p id={allergensErrorId} className="-mt-2 text-sm font-semibold text-red-800">
          {state.fieldErrors.allergens}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton isEditing={Boolean(attendeeId)} />
        <p
          aria-live="polite"
          className={state.status === "error" ? "text-sm font-semibold text-red-800" : "text-sm font-semibold text-primary"}
        >
          {state.message}
        </p>
      </div>
    </form>
  );
}
