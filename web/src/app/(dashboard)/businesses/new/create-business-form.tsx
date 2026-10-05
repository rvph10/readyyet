"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { isSupportedCountry, isValidPhoneNumber, type Country } from "react-phone-number-input";
import { Button } from "@/components/ui/button";
import { Field, validityMessage } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon } from "@/components/ui/icon";
import { RadioCards } from "@/components/ui/radio-cards";
import { Steps } from "@/components/ui/steps";
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
const FALLBACK_TIME_ZONE = "Europe/Brussels";
const STEP_ONE_FIELDS = ["name", "location.businessTypeCode"];
const SHOWN_FIELDS = [...STEP_ONE_FIELDS, "location.name", "location.contactPhone", "location.contactEmail"];

function browserCountry(timeZone: string): Country {
  const region = new Intl.Locale(navigator.language).region;
  return COUNTRY_BY_TIME_ZONE[timeZone] ?? (region && isSupportedCountry(region) ? region : FALLBACK_COUNTRY);
}

// The API takes a region's zone only, never UTC, which Linux machines and
// anti-fingerprinting browsers report.
function browserTimeZone() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timeZone === "UTC" || timeZone.startsWith("Etc/") ? FALLBACK_TIME_ZONE : timeZone;
}

interface Props {
  businessTypes: { code: string; label: string }[];
  email: string;
}

// Two steps: the Business, then its first Location. Checked here before
// anything is sent, with the errors under their fields in the page's
// language (ADR 0049), then again by the API, whose refusals land in the
// same places.
export function CreateBusinessForm({ businessTypes, email }: Props) {
  const t = useTranslations("createBusiness");
  const locale = useLocale();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [businessTypeCode, setBusinessTypeCode] = useState("");
  const [locationName, setLocationName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState(email);
  const [country, setCountry] = useState<Country>(FALLBACK_COUNTRY);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  // A field's own check first, then what the API said about it.
  const errorFor = (field: string) => errors[field] ?? (failure?.fields?.[field] ? t("invalid") : null);

  // The field's error goes as soon as it's changed.
  function edited(field: string) {
    setErrors((shown) => {
      const rest = { ...shown };
      delete rest[field];
      return rest;
    });
  }

  function toStepTwo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (!name.trim()) found.name = t("nameMissing");
    if (!businessTypeCode) found["location.businessTypeCode"] = t("businessTypeMissing");
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setCountry(browserCountry(browserTimeZone()));
    setStep(2);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const emailInput = event.currentTarget.elements.namedItem("contactEmail") as HTMLInputElement;
    const emailProblem = validityMessage(emailInput, {
      valueMissing: t("emailInvalid"),
      typeMismatch: t("emailInvalid"),
    });
    const found: Record<string, string> = {};
    if (!locationName.trim()) found["location.name"] = t("locationNameMissing");
    if (!isValidPhoneNumber(contactPhone)) found["location.contactPhone"] = t("phoneInvalid");
    if (emailProblem) found["location.contactEmail"] = emailProblem;
    setErrors(found);
    if (Object.keys(found).length > 0) return;
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

  const progress = (
    <div className="mb-6">
      <Steps steps={[t("stepBusiness"), t("stepLocation")]} current={step} label={t("stepOf", { step, steps: 2 })} />
    </div>
  );

  if (step === 1) {
    return (
      <form key="business" onSubmit={toStepTwo} noValidate>
        {progress}
        <div className="flex flex-col gap-6">
          <Field
            label={t("name")}
            hint={t("nameHint")}
            placeholder={t("namePlaceholder")}
            maxLength={100}
            autoFocus
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              edited("name");
            }}
            error={errorFor("name")}
          />
          <RadioCards
            legend={t("businessType")}
            name="businessTypeCode"
            options={businessTypes.map(({ code, label }) => ({ value: code, label }))}
            value={businessTypeCode}
            onChange={(code) => {
              setBusinessTypeCode(code);
              edited("location.businessTypeCode");
            }}
            error={errorFor("location.businessTypeCode")}
          />
          <Button type="submit" size="lg">
            {t("next")}
            <Icon name="arrow-right" className="size-3" />
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form key="location" onSubmit={submit} noValidate>
      {progress}
      <div className="flex flex-col gap-6">
        {failure && !SHOWN_FIELDS.some((field) => failure.fields?.[field]) && (
          <FormAlert>{t(failure.code === "RATE_LIMITED" ? "rateLimited" : "unexpected")}</FormAlert>
        )}
        <Field
          label={t("locationName")}
          hint={t("locationNameHint")}
          // Left empty, with an example built from the Business's name, so
          // the owner names the shop rather than accepting the company's
          // name without noticing the difference (ADR 0067).
          placeholder={t("locationNamePlaceholder", { name: name.trim() })}
          maxLength={100}
          autoFocus
          value={locationName}
          onChange={(event) => {
            setLocationName(event.target.value);
            edited("location.name");
          }}
          error={errorFor("location.name")}
        />
        <PhoneField
          label={t("contactPhone")}
          value={contactPhone}
          onChange={(phone) => {
            setContactPhone(phone);
            edited("location.contactPhone");
          }}
          defaultCountry={country}
          error={errorFor("location.contactPhone")}
        />
        <Field
          label={t("contactEmail")}
          hint={t("contactEmailHint")}
          type="email"
          name="contactEmail"
          required
          autoComplete="email"
          value={contactEmail}
          onChange={(event) => {
            setContactEmail(event.target.value);
            edited("location.contactEmail");
          }}
          error={errorFor("location.contactEmail")}
        />
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" onClick={() => setStep(1)}>
            {t("back")}
          </Button>
          <Button type="submit" size="lg" pending={pending} pendingLabel={t("creating")}>
            {t("submit")}
          </Button>
        </div>
      </div>
    </form>
  );
}
