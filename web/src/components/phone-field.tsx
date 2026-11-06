"use client";

import * as flagSvgs from "country-flag-icons/string/3x2";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, type FocusEventHandler } from "react";
import PhoneInput, { getCountryCallingCode, type Country } from "react-phone-number-input";
import en from "react-phone-number-input/locale/en";
import fr from "react-phone-number-input/locale/fr";
import { describedBy, FieldFrame } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";

const LABELS = { en, fr };

// The countries ReadyYet sells in first, then the rest A to Z.
const COUNTRY_ORDER: ("|" | "..." | Country)[] = ["BE", "FR", "LU", "NL", "|", "..."];

// Flags are bundled as SVG strings, not fetched, so the CSP stays closed:
// data: images are allowed, an image host would have to be added.
function flagUrl(country: Country) {
  return `data:image/svg+xml,${encodeURIComponent((flagSvgs as Record<string, string>)[country])}`;
}

interface CountrySelectProps {
  value?: Country;
  options: { value?: Country; label: string; divider?: boolean }[];
  onChange: (country?: Country) => void;
  onFocus: FocusEventHandler<HTMLSelectElement>;
  onBlur: FocusEventHandler<HTMLSelectElement>;
  disabled?: boolean;
  "aria-label": string;
}

// ADR 0066: the field shows the chosen flag and a chevron, drawn here, under
// a transparent <select> that takes the clicks, so phones keep their native
// picker. Where the browser has the customizable select, the list opens as
// SelectField's does (ADR 0056), each country with its flag and code;
// elsewhere the browser's own list shows their names only.
function CountrySelect({
  value,
  options,
  onChange,
  onFocus,
  onBlur,
  disabled,
  "aria-label": label,
}: CountrySelectProps) {
  const select = useRef<HTMLSelectElement>(null);

  // React refuses elements inside an <option>, so each flag is a background
  // set through the CSSOM, which the CSP allows where a style attribute
  // would be refused (ADR 0048).
  useEffect(() => {
    for (const option of select.current!.options) {
      option.style.setProperty("--flag", `url("${flagUrl(option.value as Country)}")`);
    }
  }, [options]);

  return (
    <div className="relative flex h-full shrink-0 items-center gap-1.5 border-r border-border pr-3">
      {value && (
        // eslint-disable-next-line @next/next/no-img-element -- a data: URL, nothing to optimise
        <img src={flagUrl(value)} alt="" className="h-3.5 w-5 rounded-[3px] shadow-[0_0_0_1px] shadow-ink/10" />
      )}
      <Icon name="arrow-down-1" className="size-3 text-muted" />
      <select
        ref={select}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as Country)}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={disabled}
        className="select-field phone-country absolute inset-0 cursor-pointer border-0 bg-transparent text-transparent outline-none"
      >
        {options.map((option) =>
          option.divider || !option.value ? (
            <hr key="divider" />
          ) : (
            <option key={option.value} value={option.value} data-code={`+${getCountryCallingCode(option.value)}`}>
              {option.label}
            </option>
          ),
        )}
      </select>
    </div>
  );
}

interface Props {
  label: string;
  // For a row that already shows what the field is for.
  hideLabel?: boolean;
  value: string;
  onChange: (value: string) => void;
  defaultCountry: Country;
  error?: string | null;
}

// Always gives the international format the API's @IsPhoneNumber accepts
// (ADR 0047). Drawn like a Field, the library's box outlined and ringed as an
// input is.
export function PhoneField({ label, hideLabel, value, onChange, defaultCountry, error }: Props) {
  const t = useTranslations("common");
  const locale = useLocale() as keyof typeof LABELS;
  const id = useId();
  return (
    <FieldFrame id={id} label={label} hideLabel={hideLabel} error={error}>
      <PhoneInput
        value={value}
        onChange={(phone) => onChange(phone ?? "")}
        defaultCountry={defaultCountry}
        labels={LABELS[locale]}
        countrySelectComponent={CountrySelect}
        countrySelectProps={{ "aria-label": t("country") }}
        countryOptionsOrder={COUNTRY_ORDER}
        addInternationalOption={false}
        international
        countryCallingCodeEditable={false}
        autoComplete="tel"
        className={`flex h-12 items-center gap-3 rounded-xl border bg-surface px-4 transition has-focus:ring-3 ${
          error
            ? "border-danger has-focus:ring-danger/15"
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
