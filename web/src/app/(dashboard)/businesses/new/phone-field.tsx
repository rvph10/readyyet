"use client";

import { useLocale } from "next-intl";
import { useId } from "react";
import PhoneInput, { type Country } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import en from "react-phone-number-input/locale/en";
import fr from "react-phone-number-input/locale/fr";
import "react-phone-number-input/style.css";
import { describedBy, FieldFrame } from "@/components/ui/field";

const LABELS = { en, fr };

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  defaultCountry: Country;
  error?: string | null;
}

// Always gives the international format the API's @IsPhoneNumber accepts
// (ADR 0047). Flags are bundled, not fetched, so the CSP stays closed. Drawn
// like a Field, the library's box outlined and ringed as an input is.
export function PhoneField({ label, value, onChange, defaultCountry, error }: Props) {
  const locale = useLocale() as keyof typeof LABELS;
  const id = useId();
  return (
    <FieldFrame id={id} label={label} error={error}>
      <PhoneInput
        value={value}
        onChange={(phone) => onChange(phone ?? "")}
        defaultCountry={defaultCountry}
        flags={flags}
        labels={LABELS[locale]}
        international
        countryCallingCodeEditable={false}
        autoComplete="tel"
        className={`h-12 gap-1 rounded-xl border bg-surface pr-4 pl-4 transition has-focus:ring-3 ${
          error
            ? "border-red-700 has-focus:ring-red-700/15"
            : "border-border hover:border-border-strong has-focus:border-ink has-focus:ring-ink/10"
        }`}
        numberInputProps={{
          ...describedBy(id, undefined, error),
          className: "h-full min-w-0 flex-1 bg-transparent text-label-md text-ink outline-none",
        }}
      />
    </FieldFrame>
  );
}
