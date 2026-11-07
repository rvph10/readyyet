"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { getCountries, isSupportedCountry } from "react-phone-number-input";
import { PhoneField } from "@/components/phone-field";
import { Field, SelectField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import type { components } from "@/lib/api/schema";
import { fieldErrors } from "@/lib/validation";
import { updateLocation } from "./actions";
import { shopSchema } from "./schema";
import { FieldGroup, SectionForm, useInBrowser } from "./section-form";

type Location = components["schemas"]["LocationDto"];

const LOCALES = ["EN", "FR"] as const;
const FALLBACK_COUNTRY = "BE";
const FIRST_COUNTRIES = ["BE", "FR", "LU", "NL"];

function fromLocation({ name, contactPhone, contactEmail, address, locale }: Location) {
  return {
    name,
    contactPhone,
    contactEmail,
    streetAddress: address?.streetAddress ?? "",
    postalCode: address?.postalCode ?? "",
    addressLocality: address?.addressLocality ?? "",
    addressCountry: address?.addressCountry ?? FALLBACK_COUNTRY,
    locale,
  };
}

// The countries a shop here is likely in first, then the rest by name.
function countryCodes(locale: string) {
  const names = new Intl.DisplayNames([locale], { type: "region" });
  const rest = getCountries()
    .filter((code) => !FIRST_COUNTRIES.includes(code))
    .sort((a, b) => (names.of(a) ?? a).localeCompare(names.of(b) ?? b, locale));
  return [...FIRST_COUNTRIES, ...rest];
}

export function ShopDetails({ location }: { location: Location }) {
  const t = useTranslations("settings");
  const pageLocale = useLocale();
  const toast = useToast();
  const saved = fromLocation(location);
  const [form, setForm] = useState(saved);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inBrowser = useInBrowser();
  const languages = new Intl.DisplayNames([pageLocale], { type: "language" });
  const regions = new Intl.DisplayNames([pageLocale], { type: "region" });
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  function set(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((shown) => Object.fromEntries(Object.entries(shown).filter(([field]) => field !== key)));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = shopSchema(t).safeParse(form);
    setFailure(null);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    const { name, contactPhone, contactEmail, streetAddress, postalCode, addressLocality, addressCountry } =
      parsed.data;
    const address = streetAddress ? { streetAddress, postalCode, addressLocality, addressCountry } : null;
    const addressChanged =
      streetAddress !== saved.streetAddress ||
      postalCode !== saved.postalCode ||
      addressLocality !== saved.addressLocality ||
      (Boolean(streetAddress) && addressCountry !== saved.addressCountry);
    startTransition(async () => {
      // Only what changed, so a colleague's edit to another field survives.
      const result = await orFailure(
        updateLocation(location.id, {
          ...(name !== saved.name && { name }),
          ...(contactPhone !== saved.contactPhone && { contactPhone }),
          ...(contactEmail !== saved.contactEmail && { contactEmail }),
          ...(form.locale !== saved.locale && { locale: form.locale }),
          ...(addressChanged && { address }),
        }),
      );
      if (result.ok) {
        // What the fields hold now is what's saved, as the schema trims them.
        setForm((current) => ({ ...current, name, contactEmail, streetAddress, postalCode, addressLocality }));
        toast({ message: t("saved") });
      } else if (result.fields?.contactEmail) {
        setErrors({ contactEmail: t("emailInvalid") });
      } else if (result.fields?.contactPhone) {
        setErrors({ contactPhone: t("phoneInvalid") });
      } else {
        setFailure(t("saveFailed"));
      }
    });
  }

  return (
    <SectionForm
      title={t("nav.shop")}
      hint={t("shopHint")}
      onSubmit={submit}
      onDiscard={() => {
        setForm(saved);
        setErrors({});
        setFailure(null);
      }}
      dirty={dirty}
      pending={pending}
      failure={failure}
    >
      <FieldGroup title={t("identityTitle")} hint={t("nameHint")}>
        <Field
          className="col-span-6 sm:col-span-4"
          label={t("name")}
          autoComplete="off"
          maxLength={100}
          value={form.name}
          onChange={(event) => set("name", event.target.value)}
          error={errors.name}
        />
        <SelectField
          className="col-span-6 sm:col-span-2"
          label={t("languageShort")}
          value={form.locale}
          onChange={(event) => set("locale", event.target.value)}
        >
          {LOCALES.map((option) => (
            <option key={option} value={option}>
              {languages.of(option.toLowerCase())}
            </option>
          ))}
        </SelectField>
      </FieldGroup>
      <FieldGroup title={t("contactTitle")} hint={t("contactHint")}>
        <div className="col-span-6 sm:col-span-3">
          <PhoneField
            label={t("phone")}
            value={form.contactPhone}
            onChange={(value) => set("contactPhone", value)}
            defaultCountry={isSupportedCountry(form.addressCountry) ? form.addressCountry : FALLBACK_COUNTRY}
            error={errors.contactPhone}
          />
        </div>
        <Field
          className="col-span-6 sm:col-span-3"
          label={t("email")}
          hint={t("emailHint")}
          type="email"
          autoComplete="off"
          value={form.contactEmail}
          onChange={(event) => set("contactEmail", event.target.value)}
          error={errors.contactEmail}
        />
      </FieldGroup>
      <FieldGroup title={t("addressLabel")} hint={t("addressRowHint")}>
        <Field
          className="col-span-6"
          label={t("street")}
          autoComplete="off"
          value={form.streetAddress}
          onChange={(event) => set("streetAddress", event.target.value)}
          error={errors.streetAddress}
        />
        <Field
          className="col-span-2"
          label={t("postalCode")}
          autoComplete="off"
          value={form.postalCode}
          onChange={(event) => set("postalCode", event.target.value)}
          error={errors.postalCode}
        />
        <Field
          className="col-span-4 sm:col-span-2"
          label={t("city")}
          autoComplete="off"
          value={form.addressLocality}
          onChange={(event) => set("addressLocality", event.target.value)}
          error={errors.addressLocality}
        />
        <SelectField
          className="col-span-6 sm:col-span-2"
          label={t("country")}
          value={form.addressCountry}
          onChange={(event) => set("addressCountry", event.target.value)}
        >
          {(inBrowser ? countryCodes(pageLocale) : [form.addressCountry]).map((code) => (
            <option key={code} value={code}>
              {regions.of(code)}
            </option>
          ))}
        </SelectField>
      </FieldGroup>
    </SectionForm>
  );
}
