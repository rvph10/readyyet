"use client";

import { useTranslations } from "next-intl";
import { startTransition, useActionState, type FormEvent, type ReactNode } from "react";
import type { ActionResult } from "@/lib/api/errors";
import { createBusiness } from "./actions";

// Where the first customers are, a Location can change it afterwards.
const DEFAULT_TIME_ZONE = "Europe/Brussels";

interface Props {
  businessTypes: { code: string; label: string }[];
  email: string;
  locale: "EN" | "FR";
}

export function CreateBusinessForm({ businessTypes, email, locale }: Props) {
  const t = useTranslations("createBusiness");
  const [result, action, pending] = useActionState(createBusiness, null as ActionResult | null);
  const failure = result?.ok === false ? result : undefined;

  function field(name: string, label: string, input: ReactNode, hint?: string) {
    const invalid = failure?.fields?.[name];
    return (
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{label}</span>
        {input}
        {hint && <span className="text-sm text-muted">{hint}</span>}
        {invalid && <span className="text-sm text-red-700">{t("invalid")}</span>}
      </label>
    );
  }

  // Not <form action>: React resets a form after its action, which would wipe
  // what the owner typed whenever the API refuses one field.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  }

  const inputClass = "rounded border border-border bg-surface px-3 py-2";

  return (
    <form onSubmit={submit} className="flex max-w-md flex-col gap-4">
      {field("name", t("name"), <input name="name" required maxLength={100} className={inputClass} />)}
      {field(
        "location.name",
        t("locationName"),
        <input name="location.name" required maxLength={100} className={inputClass} />,
        t("locationNameHint"),
      )}
      {field(
        "location.businessTypeCode",
        t("businessType"),
        <select name="location.businessTypeCode" required className={inputClass}>
          {businessTypes.map(({ code, label }) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>,
      )}
      {field(
        "location.contactPhone",
        t("contactPhone"),
        <input name="location.contactPhone" type="tel" required autoComplete="tel" className={inputClass} />,
        t("contactPhoneHint"),
      )}
      {field(
        "location.contactEmail",
        t("contactEmail"),
        <input name="location.contactEmail" type="email" required defaultValue={email} className={inputClass} />,
      )}
      {field(
        "location.locale",
        t("locale"),
        <select name="location.locale" defaultValue={locale} className={inputClass}>
          <option value="EN">English</option>
          <option value="FR">Français</option>
        </select>,
        t("localeHint"),
      )}
      {field(
        "location.timeZone",
        t("timeZone"),
        <input name="location.timeZone" required defaultValue={DEFAULT_TIME_ZONE} className={inputClass} />,
      )}
      {failure && !failure.fields && (
        <p role="alert" className="text-sm text-red-700">
          {t(failure.code === "RATE_LIMITED" ? "rateLimited" : "unexpected")}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-ink px-3 py-2 text-surface disabled:opacity-60"
      >
        {t("submit")}
      </button>
    </form>
  );
}
