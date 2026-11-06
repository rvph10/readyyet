"use client";

import { NAME_MAX_LENGTH, OTHER_BUSINESS_TYPE } from "@readyyet/shared";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import type { Country } from "react-phone-number-input";
import { newLocation } from "@/app/(create-business)/businesses/new/schema";
import { FitToHeight, TicketPreview } from "@/app/(create-business)/businesses/new/ticket-preview";
import { PRICES } from "@/app/(dashboard)/locations/[locationId]/plan-prices";
import { PhoneField } from "@/components/phone-field";
import { Button, buttonClass } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Panel } from "@/components/ui/panel";
import { RadioCards } from "@/components/ui/radio-cards";
import type { WorkflowStep } from "@/components/workflow-steps";
import type { ActionFailure } from "@/lib/api/errors";
import { orFailure } from "@/lib/api/or-failure";
import { browserTimeZone, FALLBACK_COUNTRY } from "@/lib/browser-region";
import { fieldErrors } from "@/lib/validation";
import { addLocation } from "./actions";

const SHOWN_FIELDS = ["name", "businessTypeCode", "businessTypeDetail", "contactPhone", "contactEmail"];

interface Props {
  business: { id: string; name: string };
  businessTypes: { code: string; label: string; steps: WorkflowStep[] }[];
  email: string;
  country: Country | undefined;
}

// ADR 0102: one page rather than the first Business's two steps, as the
// Business itself is already known.
export function NewLocationForm({ business, businessTypes, email, country }: Props) {
  const t = useTranslations("createBusiness");
  const tNew = useTranslations("business.newLocation");
  const format = useFormatter();
  const locale = useLocale();
  const [name, setName] = useState("");
  const [businessTypeCode, setBusinessTypeCode] = useState("");
  const [businessTypeDetail, setBusinessTypeDetail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState(email);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const chosenType = businessTypes.find(({ code }) => code === businessTypeCode);
  const otherType = businessTypes.find(({ code }) => code === OTHER_BUSINESS_TYPE);
  const isOther = businessTypeCode === OTHER_BUSINESS_TYPE;

  const errorFor = (field: string) => errors[field] ?? (failure?.fields?.[field] ? t("invalid") : null);

  function edited(field: string) {
    setErrors((shown) => {
      const rest = { ...shown };
      delete rest[field];
      return rest;
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const location = newLocation(t).safeParse({
      name,
      businessTypeCode,
      businessTypeDetail: isOther ? businessTypeDetail : undefined,
      contactPhone,
      contactEmail,
    });
    setErrors(location.success ? {} : fieldErrors(location.error));
    if (!location.success) return;
    startTransition(async () => {
      const result = await orFailure(
        addLocation(business.id, {
          ...location.data,
          // Both changed later in the Location's settings (ADR 0047).
          locale: locale.toUpperCase() as "EN" | "FR",
          timeZone: browserTimeZone(),
        }),
      );
      if (!result.ok) setFailure(result);
    });
  }

  return (
    <Panel padding="none" className="grid flex-1 overflow-clip lg:grid-cols-2">
      <form onSubmit={submit} noValidate className="flex flex-col gap-6 p-5 lg:p-8 xl:p-10">
        {failure && !SHOWN_FIELDS.some((field) => failure.fields?.[field]) && (
          <FormAlert>{t(failure.code === "RATE_LIMITED" ? "rateLimited" : "unexpected")}</FormAlert>
        )}
        <Field
          label={t("locationName")}
          hint={tNew("nameHint")}
          placeholder={t("locationNamePlaceholder", { name: business.name })}
          maxLength={NAME_MAX_LENGTH}
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
          options={businessTypes
            .filter(({ code }) => code !== OTHER_BUSINESS_TYPE)
            .map(({ code, label }) => ({ value: code, label }))}
          other={
            otherType && {
              value: otherType.code,
              label: otherType.label,
              placeholder: t("businessTypeDetail"),
              text: businessTypeDetail,
              onTextChange: setBusinessTypeDetail,
              maxLength: NAME_MAX_LENGTH,
            }
          }
          value={businessTypeCode}
          onChange={(code) => {
            setBusinessTypeCode(code);
            edited("businessTypeCode");
          }}
          error={errorFor("businessTypeCode")}
        />
        <PhoneField
          label={t("contactPhone")}
          value={contactPhone}
          onChange={(phone) => {
            setContactPhone(phone);
            edited("contactPhone");
          }}
          defaultCountry={country ?? FALLBACK_COUNTRY}
          error={errorFor("contactPhone")}
        />
        <Field
          label={t("contactEmail")}
          hint={t("contactEmailHint")}
          type="email"
          autoComplete="email"
          value={contactEmail}
          onChange={(event) => {
            setContactEmail(event.target.value);
            edited("contactEmail");
          }}
          error={errorFor("contactEmail")}
        />
        <div className="mt-auto flex flex-col gap-4 pt-2">
          <p className="rounded-2xl bg-brand px-4 py-3 text-p-sm text-ink">
            {tNew("planNotice", {
              price: format.number(PRICES.ESSENTIEL.MONTH, {
                style: "currency",
                currency: "EUR",
                maximumFractionDigits: 0,
              }),
            })}
          </p>
          <div className="flex justify-end gap-3">
            <Link href={`/businesses/${business.id}`} className={buttonClass({ variant: "secondary" })}>
              {tNew("cancel")}
            </Link>
            <Button type="submit" pending={pending} pendingLabel={t("creating")}>
              {tNew("submit")}
            </Button>
          </div>
        </div>
      </form>
      <aside className="hidden flex-col border-l border-border bg-subtle p-8 lg:flex xl:p-10">
        <div className="sticky top-21 flex h-[calc(100dvh-11rem)] flex-col">
          <p className="text-title-h6">{t("previewTitle")}</p>
          <p className="mt-1 max-w-md text-p-sm text-muted">{t("previewText")}</p>
          <FitToHeight className="mt-6 min-h-0 flex-1">
            <div className="mx-auto w-full max-w-sm">
              <TicketPreview
                avatarId={email}
                businessName={business.name}
                shopName={name.trim() || business.name}
                businessType={chosenType}
                businessTypeDetail={isOther ? businessTypeDetail.trim() : ""}
                phone={contactPhone}
                email={contactEmail}
              />
            </div>
          </FitToHeight>
        </div>
      </aside>
    </Panel>
  );
}
