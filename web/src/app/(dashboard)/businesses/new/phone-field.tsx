"use client";

import { useLocale } from "next-intl";
import PhoneInput, { type Country } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import en from "react-phone-number-input/locale/en";
import fr from "react-phone-number-input/locale/fr";
import "react-phone-number-input/style.css";

const LABELS = { en, fr };

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
  defaultCountry: Country;
}

// Always gives the international format the API's @IsPhoneNumber accepts
// (ADR 0047). Flags are bundled, not fetched, so the CSP stays closed.
export function PhoneField({ id, value, onChange, defaultCountry }: Props) {
  const locale = useLocale() as keyof typeof LABELS;
  return (
    <PhoneInput
      id={id}
      value={value}
      onChange={(phone) => onChange(phone ?? "")}
      defaultCountry={defaultCountry}
      flags={flags}
      labels={LABELS[locale]}
      international
      countryCallingCodeEditable={false}
      autoComplete="tel"
      className="rounded border border-border bg-surface px-3 py-2"
      numberInputProps={{ className: "bg-transparent outline-none" }}
    />
  );
}
