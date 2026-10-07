"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { isKnownSchoolOption, SCHOOL_OPTIONS, SCHOOL_OTHER_VALUE } from "@/lib/school";

type SchoolSelectProps = {
  name?: string;
  otherName?: string;
  defaultValue?: string | null;
  required?: boolean;
  placeholder?: string;
  otherPlaceholder?: string;
};

export function SchoolSelect({
  name = "school",
  otherName = "schoolOther",
  defaultValue,
  required = true,
  placeholder = "Select university",
  otherPlaceholder = "Write university or school",
}: SchoolSelectProps) {
  const initialValue = useMemo(() => {
    const trimmed = defaultValue?.trim() ?? "";
    if (!trimmed) return "";
    return isKnownSchoolOption(trimmed) ? trimmed : SCHOOL_OTHER_VALUE;
  }, [defaultValue]);
  const initialOtherValue = useMemo(() => {
    const trimmed = defaultValue?.trim() ?? "";
    if (!trimmed || isKnownSchoolOption(trimmed)) return "";
    return trimmed === SCHOOL_OTHER_VALUE ? "" : trimmed;
  }, [defaultValue]);
  const [selectedSchool, setSelectedSchool] = useState(initialValue);
  const showOtherInput = selectedSchool === SCHOOL_OTHER_VALUE;

  return (
    <div className="mt-1 grid gap-2">
      <Select name={name} required={required} value={selectedSchool} onChange={(event) => setSelectedSchool(event.target.value)}>
        <option value="">{placeholder}</option>
        {SCHOOL_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        <option value={SCHOOL_OTHER_VALUE}>Other</option>
      </Select>
      {showOtherInput ? (
        <Input name={otherName} required={required} defaultValue={initialOtherValue} placeholder={otherPlaceholder} />
      ) : null}
    </div>
  );
}
