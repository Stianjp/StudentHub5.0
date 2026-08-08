"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { FeedbackSlugSuggestionGroup } from "@/lib/feedback";

type SlugPickerProps = {
  name: string;
  label: string;
  groups: FeedbackSlugSuggestionGroup[];
  defaultValue?: string;
  placeholder?: string;
  helpText?: string;
};

type Mode = "existing" | "custom";

const CUSTOM_VALUE = "__custom__";

export function SlugPicker({
  name,
  label,
  groups,
  defaultValue = "",
  placeholder = "student-connect-2026",
  helpText,
}: SlugPickerProps) {
  const hasSuggestions = groups.some((group) => group.options.length > 0);
  const allValues = useMemo(() => new Set(groups.flatMap((group) => group.options.map((option) => option.value))), [groups]);
  const defaultIsSuggestion = defaultValue.length > 0 && allValues.has(defaultValue);

  const [mode, setMode] = useState<Mode>(() => {
    if (!hasSuggestions) return "custom";
    if (defaultIsSuggestion) return "existing";
    return defaultValue.length > 0 ? "custom" : "existing";
  });
  const [selectedValue, setSelectedValue] = useState(defaultIsSuggestion ? defaultValue : "");
  const [customValue, setCustomValue] = useState(defaultValue);

  const selectValue = mode === "existing" ? selectedValue : CUSTOM_VALUE;

  return (
    <div className="grid gap-2">
      <label className="text-sm font-semibold text-primary">
        {label}
        {mode === "existing" && hasSuggestions ? (
          <Select
            name={name}
            value={selectValue}
            onChange={(event) => {
              const value = event.target.value;
              if (value === CUSTOM_VALUE) {
                setMode("custom");
                setCustomValue(selectedValue);
                return;
              }
              setSelectedValue(value);
            }}
          >
            <option value="">Velg eksisterende slug</option>
            {groups.map((group) =>
              group.options.length > 0 ? (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((option) => (
                    <option key={`${group.label}-${option.value}-${option.label}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ) : null,
            )}
            <option value={CUSTOM_VALUE}>+ Legg til ny slug</option>
          </Select>
        ) : (
          <Input
            name={name}
            value={customValue}
            onChange={(event) => setCustomValue(event.target.value)}
            placeholder={placeholder}
          />
        )}
      </label>

      {helpText ? <p className="text-xs text-primary/55">{helpText}</p> : null}

      {mode === "existing" && hasSuggestions ? (
        <Button
          type="button"
          variant="secondary"
          className="w-fit"
          onClick={() => {
            setMode("custom");
          }}
        >
          Legg til ny slug
        </Button>
      ) : hasSuggestions ? (
        <Button type="button" variant="ghost" className="w-fit" onClick={() => setMode("existing")}>
          Bruk eksisterende slugs
        </Button>
      ) : null}
    </div>
  );
}
