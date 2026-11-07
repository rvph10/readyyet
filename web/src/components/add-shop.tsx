"use client";

import { NAME_MAX_LENGTH, OTHER_BUSINESS_TYPE } from "@readyyet/shared";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { createContext, useCallback, useContext, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { newLocation } from "@/app/(create-business)/businesses/new/schema";
import { PRICES } from "@/app/(dashboard)/locations/[locationId]/plan-prices";
import { PhoneField } from "@/components/phone-field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon } from "@/components/ui/icon";
import { RadioCards } from "@/components/ui/radio-cards";
import { Skeleton } from "@/components/ui/skeleton";
import { Steps } from "@/components/ui/steps";
import type { ActionFailure } from "@/lib/api/errors";
import { orFailure } from "@/lib/api/or-failure";
import { browserTimeZone, FALLBACK_COUNTRY } from "@/lib/browser-region";
import { fieldErrors } from "@/lib/validation";
import { addLocation, addShopData } from "./add-shop-actions";

// What each step asks, so Next only stops on what's in front of the Owner.
const STEPS = [["name"], ["businessTypeCode", "businessTypeDetail"], ["contactPhone", "contactEmail"]];

const AddShopContext = createContext<() => void>(() => undefined);

// Opens from the top bar on any page of an Owner, as well as from their home.
export const useAddShop = () => useContext(AddShopContext);

type Data = Awaited<ReturnType<typeof addShopData>>;

function AddShopForm({ businessId, data, onClose }: { businessId: string; data: Data; onClose: () => void }) {
  const t = useTranslations("createBusiness");
  const tNew = useTranslations("business.newLocation");
  const format = useFormatter();
  const locale = useLocale();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [businessTypeCode, setBusinessTypeCode] = useState("");
  const [businessTypeDetail, setBusinessTypeDetail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState(data.email);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const otherType = data.businessTypes.find(({ code }) => code === OTHER_BUSINESS_TYPE);
  const isOther = businessTypeCode === OTHER_BUSINESS_TYPE;
  const last = step === STEPS.length - 1;

  const errorFor = (field: string) => errors[field] ?? (failure?.fields?.[field] ? t("invalid") : null);

  function edited(field: string) {
    setErrors((shown) => Object.fromEntries(Object.entries(shown).filter(([other]) => other !== field)));
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
    const found = location.success ? {} : fieldErrors(location.error);
    const here = Object.fromEntries(Object.entries(found).filter(([field]) => STEPS[step].includes(field)));
    setErrors(here);
    if (Object.keys(here).length > 0) return;
    if (!last) {
      setStep(step + 1);
      return;
    }
    if (!location.success) return;
    startTransition(async () => {
      const result = await orFailure(
        addLocation(businessId, {
          ...location.data,
          // Both changed later in the Location's settings (ADR 0047).
          locale: locale.toUpperCase() as "EN" | "FR",
          timeZone: browserTimeZone(),
        }),
      );
      if (result.ok) return;
      setFailure(result);
      // Back to whatever the API refused.
      const refused = STEPS.findIndex((fields) => fields.some((field) => result.fields?.[field]));
      if (refused >= 0) setStep(refused);
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-4 md:px-7">
        <Steps
          steps={[tNew("stepName"), tNew("stepType"), tNew("stepContact")]}
          current={step + 1}
          label={t("stepOf", { step: step + 1, steps: STEPS.length })}
        />
        {failure && !STEPS.flat().some((field) => failure.fields?.[field]) && (
          <FormAlert>{t(failure.code === "RATE_LIMITED" ? "rateLimited" : "unexpected")}</FormAlert>
        )}
        {step === 0 && (
          <>
            <div>
              <p className="text-title-h6">{tNew("nameTitle")}</p>
              <p className="mt-1 text-p-sm text-muted">{tNew("nameHint")}</p>
            </div>
            <Field
              label={t("locationName")}
              placeholder={t("locationNamePlaceholder", { name: data.businessName })}
              maxLength={NAME_MAX_LENGTH}
              autoFocus
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                edited("name");
              }}
              error={errorFor("name")}
            />
          </>
        )}
        {step === 1 && (
          <>
            <div>
              <p className="text-title-h6">{tNew("typeTitle")}</p>
              <p className="mt-1 text-p-sm text-muted">{tNew("typeHint")}</p>
            </div>
            <RadioCards
              legend={t("businessType")}
              name="businessTypeCode"
              options={data.businessTypes
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
          </>
        )}
        {step === 2 && (
          <>
            <div>
              <p className="text-title-h6">{tNew("contactTitle")}</p>
              <p className="mt-1 text-p-sm text-muted">{tNew("contactHint")}</p>
            </div>
            <PhoneField
              label={t("contactPhone")}
              value={contactPhone}
              onChange={(phone) => {
                setContactPhone(phone);
                edited("contactPhone");
              }}
              defaultCountry={data.country ?? FALLBACK_COUNTRY}
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
            <p className="rounded-2xl bg-brand px-4 py-3 text-p-sm text-ink">
              {tNew("planNotice", {
                price: format.number(PRICES.ESSENTIEL.MONTH, {
                  style: "currency",
                  currency: "EUR",
                  maximumFractionDigits: 0,
                }),
              })}
            </p>
          </>
        )}
      </div>
      <div className="flex gap-2 border-t border-border px-6 py-4 md:px-7">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => {
            if (step === 0) onClose();
            else setStep(step - 1);
          }}
        >
          {step === 0 ? tNew("cancel") : t("back")}
        </Button>
        <Button type="submit" pending={pending} pendingLabel={t("creating")} className="flex-1">
          {last ? tNew("submit") : t("next")}
        </Button>
      </div>
    </form>
  );
}

// ADR 0110: a drawer over the page, one question at a time, as adding a shop is
// short enough not to need a page of its own.
export function AddShopProvider({ businessId, children }: { businessId: string; children: ReactNode }) {
  const t = useTranslations("dashboard");
  const tDetail = useTranslations("ticketDetail");
  const [open, setOpen] = useState(false);
  const [run, setRun] = useState(0);
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);

  const start = useCallback(() => {
    setRun((value) => value + 1);
    setFailed(false);
    setOpen(true);
    addShopData(businessId).then(setData, () => setFailed(true));
  }, [businessId]);

  return (
    <AddShopContext.Provider value={start}>
      {children}
      <Dialog open={open} onClose={() => setOpen(false)} title={t("addLocation")} variant="panel">
        {open && data && <AddShopForm key={run} businessId={businessId} data={data} onClose={() => setOpen(false)} />}
        {open && !data && !failed && (
          <div aria-busy className="flex flex-col gap-4 px-6 py-4 md:px-7">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
        {open && failed && (
          <div className="px-6 py-4 md:px-7">
            <FormAlert>{tDetail("statusErrors.unexpected")}</FormAlert>
          </div>
        )}
      </Dialog>
    </AddShopContext.Provider>
  );
}

export function AddShopButton() {
  const t = useTranslations("dashboard");
  const addShop = useAddShop();
  return (
    <Button onClick={addShop}>
      <Icon name="add" className="size-3.5 text-brand" />
      {t("addLocation")}
    </Button>
  );
}

// The last tile of the grid, where the next shop would be.
export function AddShopTile() {
  const t = useTranslations("dashboard");
  const tBusiness = useTranslations("business.home");
  const addShop = useAddShop();
  return (
    <button
      type="button"
      onClick={addShop}
      className="group flex h-full min-h-56 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-sheet border-2 border-dashed border-border-strong p-5 text-center transition-colors hover:border-pine hover:bg-surface"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-brand transition-colors group-hover:bg-pine group-hover:text-brand">
        <Icon name="add" className="size-4" />
      </span>
      <span>
        <span className="block text-title-h6">{t("addLocation")}</span>
        <span className="block text-p-sm text-muted">{tBusiness("addHint")}</span>
      </span>
    </button>
  );
}
