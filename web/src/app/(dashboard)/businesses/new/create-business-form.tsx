"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { isSupportedCountry, isValidPhoneNumber, type Country } from "react-phone-number-input";
import type { ActionFailure } from "@/lib/api/errors";
import { createBusiness } from "./actions";
import { PhoneField } from "./phone-field";

// The time zone says where the shop is better than the browser's language,
// which is often English in Belgium. Only the countries ReadyYet sells in.
const COUNTRY_BY_TIME_ZONE: Record<string, Country> = {
  "Europe/Brussels": "BE",
  "Europe/Paris": "FR",
  "Europe/Luxembourg": "LU",
  "Europe/Amsterdam": "NL",
};
const FALLBACK_COUNTRY = "BE";
const STEP_ONE_FIELDS = ["name", "location.businessTypeCode"];

function browserCountry(timeZone: string): Country {
  const region = new Intl.Locale(navigator.language).region;
  return COUNTRY_BY_TIME_ZONE[timeZone] ?? (region && isSupportedCountry(region) ? region : FALLBACK_COUNTRY);
}

function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

interface Props {
  businessTypes: { code: string; label: string }[];
  email: string;
}

export function CreateBusinessForm({ businessTypes, email }: Props) {
  const t = useTranslations("createBusiness");
  const locale = useLocale();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [businessTypeCode, setBusinessTypeCode] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationNameEdited, setLocationNameEdited] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState(email);
  const [country, setCountry] = useState<Country>(FALLBACK_COUNTRY);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [phoneInvalid, setPhoneInvalid] = useState(false);
  const [pending, startTransition] = useTransition();

  function toStepTwo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Follows the Business's name until the owner types their own.
    if (!locationNameEdited) {
      setLocationName(name);
    }
    setCountry(browserCountry(browserTimeZone()));
    setStep(2);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidPhoneNumber(contactPhone)) {
      setPhoneInvalid(true);
      return;
    }
    setPhoneInvalid(false);
    startTransition(async () => {
      const result = await createBusiness({
        name,
        location: {
          name: locationName,
          businessTypeCode,
          contactPhone,
          contactEmail,
          // Both changed later in the Location's settings (ADR 0047).
          locale: locale.toUpperCase() as "EN" | "FR",
          timeZone: browserTimeZone(),
        },
      });
      if (!result.ok) {
        setFailure(result);
        if (STEP_ONE_FIELDS.some((field) => result.fields?.[field])) {
          setStep(1);
        }
      }
    });
  }

  const invalid = (field: string) =>
    failure?.fields?.[field] && <span className="text-sm text-red-700">{t("invalid")}</span>;
  const inputClass = "rounded border border-border bg-surface px-3 py-2";
  const buttonClass = "rounded bg-ink px-3 py-2 text-surface disabled:opacity-60";

  if (step === 1) {
    return (
      <form key="business" onSubmit={toStepTwo} className="flex max-w-md flex-col gap-5">
        <p className="text-sm text-muted">{t("stepOf", { step: 1, steps: 2 })}</p>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t("name")}</span>
          <input
            required
            maxLength={100}
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
          />
          {invalid("name")}
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">{t("businessType")}</legend>
          <div className="grid grid-cols-2 gap-2">
            {businessTypes.map(({ code, label }) => (
              <label
                key={code}
                className="flex cursor-pointer items-center gap-2 rounded border border-border bg-surface px-3 py-2 has-checked:border-ink has-checked:ring-2 has-checked:ring-brand"
              >
                <input
                  type="radio"
                  name="businessTypeCode"
                  value={code}
                  required
                  checked={businessTypeCode === code}
                  onChange={() => setBusinessTypeCode(code)}
                />
                {label}
              </label>
            ))}
          </div>
          {invalid("location.businessTypeCode")}
        </fieldset>
        <button type="submit" className={`self-start ${buttonClass}`}>
          {t("next")}
        </button>
      </form>
    );
  }

  return (
    <form key="location" onSubmit={submit} className="flex max-w-md flex-col gap-5">
      <p className="text-sm text-muted">{t("stepOf", { step: 2, steps: 2 })}</p>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t("locationName")}</span>
        <input
          required
          maxLength={100}
          value={locationName}
          onChange={(event) => {
            setLocationName(event.target.value);
            setLocationNameEdited(true);
          }}
          className={inputClass}
        />
        <span className="text-sm text-muted">{t("locationNameHint")}</span>
        {invalid("location.name")}
      </label>
      <div className="flex flex-col gap-1">
        <label htmlFor="contact-phone" className="text-sm font-medium">
          {t("contactPhone")}
        </label>
        <PhoneField id="contact-phone" value={contactPhone} onChange={setContactPhone} defaultCountry={country} />
        {(phoneInvalid || failure?.fields?.["location.contactPhone"]) && (
          <span className="text-sm text-red-700">{t("phoneInvalid")}</span>
        )}
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t("contactEmail")}</span>
        <input
          type="email"
          required
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
          className={inputClass}
        />
        <span className="text-sm text-muted">{t("contactEmailHint")}</span>
        {invalid("location.contactEmail")}
      </label>
      {failure && !failure.fields && (
        <p role="alert" className="text-sm text-red-700">
          {t(failure.code === "RATE_LIMITED" ? "rateLimited" : "unexpected")}
        </p>
      )}
      <div className="flex gap-3">
        <button type="button" onClick={() => setStep(1)} className="rounded border border-border px-3 py-2">
          {t("back")}
        </button>
        <button type="submit" disabled={pending} className={buttonClass}>
          {t("submit")}
        </button>
      </div>
    </form>
  );
}
