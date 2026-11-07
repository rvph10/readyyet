"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useSyncExternalStore, useTransition, type FormEvent } from "react";
import { getCountries, isSupportedCountry } from "react-phone-number-input";
import { PhoneField } from "@/components/phone-field";
import { Field, SelectField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import type { components } from "@/lib/api/schema";
import { fieldErrors } from "@/lib/validation";
import { updateLocation } from "./actions";
import { shopSchema } from "./schema";
import { SectionForm, SettingRow } from "./section-form";

type Location = components["schemas"]["LocationDto"];

const LOCALES = ["EN", "FR"] as const;
const FALLBACK_COUNTRY = "BE";
const FIRST_COUNTRIES = ["BE", "FR", "LU", "NL"];
const noSubscription = () => () => undefined;

function fromLocation({ name, contactPhone, contactEmail, address, locale, timeZone }: Location) {
  return {
    name,
    contactPhone,
    contactEmail,
    streetAddress: address?.streetAddress ?? "",
    postalCode: address?.postalCode ?? "",
    addressLocality: address?.addressLocality ?? "",
    addressCountry: address?.addressCountry ?? FALLBACK_COUNTRY,
    locale,
    timeZone,
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
  // The server and the browser can list these differently, so the long lists
  // wait for the browser, the saved value being all a first paint needs.
  const inBrowser = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
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
          ...(form.timeZone !== saved.timeZone && { timeZone: form.timeZone }),
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
      <SettingRow label={t("name")} hint={t("nameHint")}>
        <Field
          label={t("name")}
          hideLabel
          autoComplete="off"
          maxLength={100}
          value={form.name}
          onChange={(event) => set("name", event.target.value)}
          error={errors.name}
        />
      </SettingRow>
      <SettingRow label={t("phone")} hint={t("contactHint")}>
        <PhoneField
          label={t("phone")}
          hideLabel
          value={form.contactPhone}
          onChange={(value) => set("contactPhone", value)}
          defaultCountry={isSupportedCountry(form.addressCountry) ? form.addressCountry : FALLBACK_COUNTRY}
          error={errors.contactPhone}
        />
      </SettingRow>
      <SettingRow label={t("email")} hint={t("emailHint")}>
        <Field
          label={t("email")}
          hideLabel
          type="email"
          autoComplete="off"
          value={form.contactEmail}
          onChange={(event) => set("contactEmail", event.target.value)}
          error={errors.contactEmail}
        />
      </SettingRow>
      <SettingRow label={t("addressLabel")} hint={t("addressRowHint")}>
        <Field
          label={t("street")}
          placeholder={t("street")}
          hideLabel
          autoComplete="off"
          value={form.streetAddress}
          onChange={(event) => set("streetAddress", event.target.value)}
          error={errors.streetAddress}
        />
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Field
            label={t("postalCode")}
            placeholder={t("postalCode")}
            hideLabel
            autoComplete="off"
            value={form.postalCode}
            onChange={(event) => set("postalCode", event.target.value)}
            error={errors.postalCode}
          />
          <Field
            label={t("city")}
            placeholder={t("city")}
            hideLabel
            autoComplete="off"
            value={form.addressLocality}
            onChange={(event) => set("addressLocality", event.target.value)}
            error={errors.addressLocality}
          />
        </div>
        <SelectField
          label={t("country")}
          hideLabel
          value={form.addressCountry}
          onChange={(event) => set("addressCountry", event.target.value)}
        >
          {(inBrowser ? countryCodes(pageLocale) : [form.addressCountry]).map((code) => (
            <option key={code} value={code}>
              {regions.of(code)}
            </option>
          ))}
        </SelectField>
      </SettingRow>
      <SettingRow label={t("language")} hint={t("languageHint")}>
        <SelectField
          label={t("language")}
          hideLabel
          value={form.locale}
          onChange={(event) => set("locale", event.target.value)}
        >
          {LOCALES.map((option) => (
            <option key={option} value={option}>
              {languages.of(option.toLowerCase())}
            </option>
          ))}
        </SelectField>
      </SettingRow>
      <SettingRow label={t("timeZone")} hint={t("timeZoneHint")}>
        <SelectField
          label={t("timeZone")}
          hideLabel
          value={form.timeZone}
          onChange={(event) => set("timeZone", event.target.value)}
        >
          {(inBrowser ? Intl.supportedValuesOf("timeZone") : [form.timeZone]).map((zone) => (
            <option key={zone} value={zone}>
              {zone.replaceAll("_", " ")}
            </option>
          ))}
        </SelectField>
      </SettingRow>
    </SectionForm>
  );
}
