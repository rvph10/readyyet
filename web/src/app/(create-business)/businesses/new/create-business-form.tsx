"use client";

import { NAME_MAX_LENGTH, OTHER_BUSINESS_TYPE, TERMS_VERSION } from "@readyyet/shared";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import type { Country } from "react-phone-number-input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Panel } from "@/components/ui/panel";
import { Icon } from "@/components/ui/icon";
import { RadioCards } from "@/components/ui/radio-cards";
import { Steps } from "@/components/ui/steps";
import type { ActionFailure } from "@/lib/api/errors";
import { orFailure } from "@/lib/api/or-failure";
import { browserCountry, browserTimeZone, FALLBACK_COUNTRY } from "@/lib/browser-region";
import { fieldErrors } from "@/lib/validation";
import { createBusiness } from "./actions";
import type { WorkflowStep } from "@/components/workflow-steps";
import { PhoneField } from "@/components/phone-field";
import { businessStep, locationStep } from "./schema";
import { FitToHeight, TicketPreview } from "./ticket-preview";

const STEP_ONE_FIELDS = ["name", "location.businessTypeCode", "location.businessTypeDetail"];
const SHOWN_FIELDS = [...STEP_ONE_FIELDS, "location.name", "location.contactPhone", "location.contactEmail"];

interface Props {
  // The logo and who's signed in, over the form.
  header: ReactNode;
  businessTypes: { code: string; label: string; steps: WorkflowStep[] }[];
  email: string;
  legal: { terms: string; dpa: string };
}

// Two steps: the Business, then its first Location. Each is checked by its
// schema before going on, with the errors under their fields in the page's
// language (ADR 0049 and 0073), then again by the API, whose refusals land
// in the same places.
export function CreateBusinessForm({ header, businessTypes, email, legal }: Props) {
  const t = useTranslations("createBusiness");
  const locale = useLocale();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [businessTypeCode, setBusinessTypeCode] = useState("");
  const [businessTypeDetail, setBusinessTypeDetail] = useState("");
  const [locationName, setLocationName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState(email);
  const [country, setCountry] = useState<Country>(FALLBACK_COUNTRY);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const chosenType = businessTypes.find(({ code }) => code === businessTypeCode);
  const otherType = businessTypes.find(({ code }) => code === OTHER_BUSINESS_TYPE);

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

  const businessValues = () =>
    businessStep(t).safeParse({
      name,
      location: {
        businessTypeCode,
        businessTypeDetail: businessTypeCode === OTHER_BUSINESS_TYPE ? businessTypeDetail : undefined,
      },
    });

  function toStepTwo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const business = businessValues();
    setErrors(business.success ? {} : fieldErrors(business.error));
    if (!business.success) return;
    setCountry(browserCountry(browserTimeZone()));
    setStep(2);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const location = locationStep(t).safeParse({
      location: { name: locationName, contactPhone, contactEmail },
    });
    setErrors(location.success ? {} : fieldErrors(location.error));
    // Step one was checked on the way here.
    const business = businessValues();
    if (!location.success || !business.success) return;
    startTransition(async () => {
      const result = await orFailure(
        createBusiness({
          termsVersion: TERMS_VERSION,
          name: business.data.name,
          location: {
            ...business.data.location,
            ...location.data.location,
            // Both changed later in the Location's settings (ADR 0047).
            locale: locale.toUpperCase() as "EN" | "FR",
            timeZone: browserTimeZone(),
          },
        }),
      );
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

  const form =
    step === 1 ? (
      <form key="business" onSubmit={toStepTwo} noValidate className="flex flex-1 flex-col">
        {progress}
        <div className="flex flex-col gap-6">
          <Field
            label={t("name")}
            hint={t("nameHint")}
            placeholder={t("namePlaceholder")}
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
              edited("location.businessTypeCode");
            }}
            error={errorFor("location.businessTypeCode")}
          />
        </div>
        <div className="mt-auto pt-6">
          <Button type="submit" size="lg">
            {t("next")}
            <Icon name="arrow-right" className="size-3" />
          </Button>
        </div>
      </form>
    ) : (
      <form key="location" onSubmit={submit} noValidate className="flex flex-1 flex-col">
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
            maxLength={NAME_MAX_LENGTH}
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
            autoComplete="email"
            value={contactEmail}
            onChange={(event) => {
              setContactEmail(event.target.value);
              edited("location.contactEmail");
            }}
            error={errorFor("location.contactEmail")}
          />
        </div>
        <div className="mt-auto pt-6">
          {/* Creating the Business accepts them (ADR 0130), in a new tab so
              the form stays filled in. */}
          <p className="mb-4 text-p-sm text-pretty">
            {t.rich("terms", {
              terms: (chunks) => (
                <a
                  href={legal.terms}
                  target="_blank"
                  rel="noopener"
                  className="font-semibold underline underline-offset-2"
                >
                  {chunks}
                </a>
              ),
              dpa: (chunks) => (
                <a
                  href={legal.dpa}
                  target="_blank"
                  rel="noopener"
                  className="font-semibold underline underline-offset-2"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
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

  return (
    <>
      {/* Held to the window while the form scrolls, its preview shrunk to fit. */}
      <Panel
        as="aside"
        padding="none"
        className="sticky top-5 hidden h-[calc(100dvh-2.5rem)] w-1/2 flex-col px-8 pt-14 pb-8 lg:flex xl:px-10"
      >
        <p className="mb-3 text-title-h3 font-bold text-balance">{t("previewTitle")}</p>
        <p className="max-w-md text-p-md text-muted">{t("previewText")}</p>
        <FitToHeight className="mt-8 min-h-0 flex-1">
          <div className="mx-auto w-full max-w-sm">
            <TicketPreview
              avatarId={email}
              businessName={name.trim()}
              shopName={(locationName || name).trim()}
              businessType={chosenType}
              businessTypeDetail={businessTypeCode === OTHER_BUSINESS_TYPE ? businessTypeDetail.trim() : ""}
              phone={contactPhone}
              email={contactEmail}
            />
          </div>
        </FitToHeight>
      </Panel>
      <div className="flex w-full flex-col lg:w-1/2 lg:pl-12">
        {header}
        <main className="flex flex-1 flex-col justify-center py-8">
          {/* Both steps take the first's height at least, so their buttons
              stay in the same place from one to the other. */}
          <div className="mx-auto flex w-full max-w-md flex-col lg:min-h-152">
            <h1 className="mb-6 text-title-h4">{t("title")}</h1>
            {form}
          </div>
        </main>
      </div>
    </>
  );
}
