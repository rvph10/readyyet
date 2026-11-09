"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { isSupportedCountry } from "react-phone-number-input";
import { PhoneField } from "@/components/phone-field";
import { formatPhone } from "@/components/phone-number";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, SelectField } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import type { components } from "@/lib/api/schema";
import { useLocationActions } from "../../location-actions";
import { newCustomerSchema } from "../../new-ticket/schema";
import { eraseCustomer, updateCustomer } from "../actions";

type Locale = "EN" | "FR";

const LOCALES: Locale[] = ["EN", "FR"];
const FALLBACK_COUNTRY = "BE";

interface Props {
  locationId: string;
  customer: components["schemas"]["CustomerDto"];
  locationLocale: Locale;
  country: string | undefined;
  // Already formatted.
  since: string;
  openTickets: number;
}

function ContactLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-p-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-label-md wrap-anywhere">{value}</dd>
    </div>
  );
}

export function CustomerCard({ locationId, customer, locationLocale, country, since, openTickets }: Props) {
  const t = useTranslations("customers");
  const tTickets = useTranslations("tickets");
  const tForm = useTranslations("tickets.form");
  const { newTicketFor } = useLocationActions();
  const tDetail = useTranslations("ticketDetail");
  const pageLocale = useLocale();
  const toast = useToast();
  const savedLocale = customer.locale ?? locationLocale;
  const [editing, setEditing] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [name, setName] = useState(customer.fullName);
  const [email, setEmail] = useState(customer.email ?? "");
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [locale, setLocale] = useState<Locale>(savedLocale);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState(false);
  const [saving, startSaving] = useTransition();
  const [removing, startRemoving] = useTransition();
  const languageNames = new Intl.DisplayNames([pageLocale], { type: "language" });
  const languageName = (code: Locale) => languageNames.of(code.toLowerCase())!;

  function startEditing() {
    // A colleague may have changed them since the page opened.
    setName(customer.fullName);
    setEmail(customer.email ?? "");
    setPhone(customer.phone ?? "");
    setLocale(savedLocale);
    setErrors({});
    setFailed(false);
    setEditing(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = newCustomerSchema(tForm).safeParse({ customer: { fullName: name, email, phone } });
    const found: Record<string, string> = {};
    for (const issue of parsed.error?.issues ?? []) found[String(issue.path[1])] = issue.message;
    setErrors(found);
    setFailed(false);
    if (!parsed.success) return;
    const next = parsed.data.customer;
    startSaving(async () => {
      // Only what changed, so a colleague's edit to another field survives, and
      // an unchanged address keeps its record of having failed.
      const result = await orFailure(
        updateCustomer(locationId, customer.id, {
          ...(next.fullName !== customer.fullName && { fullName: next.fullName }),
          ...((next.email ?? null) !== customer.email && { email: next.email ?? null }),
          ...((next.phone ?? null) !== customer.phone && { phone: next.phone ?? null }),
          ...(locale !== savedLocale && { locale }),
        }),
      );
      if (result.ok) {
        setEditing(false);
        return;
      }
      if (result.fields?.email) setErrors({ email: tForm("emailInvalid") });
      else if (result.fields?.phone) setErrors({ phone: tForm("phoneInvalid") });
      else setFailed(true);
    });
  }

  function erase() {
    startRemoving(async () => {
      // On success this redirects and never comes back here.
      const result = await orFailure(eraseCustomer(locationId, customer.id));
      if (!result.ok) {
        setErasing(false);
        toast({ tone: "error", message: t("eraseFailed") });
      }
    });
  }

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <Avatar id={customer.fullName} name={customer.fullName} src={null} size="xl" />
        <Button variant="secondary" size="sm" onClick={startEditing}>
          <Icon name="edit" className="size-3" />
          {tDetail("edit")}
        </Button>
      </div>
      <h2 className="mt-4 text-title-h5 wrap-anywhere">{customer.fullName}</h2>
      <p className="text-p-sm text-muted">{t("since", { date: since })}</p>

      <Button className="mt-5" onClick={() => newTicketFor(customer)}>
        <Icon name="add" className="size-3.5 text-brand" />
        {tTickets("new")}
      </Button>

      <dl className="mt-6 flex flex-col gap-4">
        <ContactLine label={t("columns.phone")} value={customer.phone ? formatPhone(customer.phone) : t("none")} />
        <ContactLine label={t("columns.email")} value={customer.email ?? t("none")} />
        <ContactLine label={tForm("language")} value={languageName(savedLocale)} />
      </dl>

      {(customer.phone || customer.email) && (
        <div className="mt-5 flex gap-2">
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className={`${buttonClass({ variant: "secondary", size: "sm" })} min-w-0 flex-1`}
            >
              <Icon name="phone" className="size-3.5" />
              {tDetail("call")}
            </a>
          )}
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className={`${buttonClass({ variant: "secondary", size: "sm" })} min-w-0 flex-1`}
            >
              <Icon name="message" className="size-3.5" />
              {tDetail("sendEmail")}
            </a>
          )}
        </div>
      )}

      <section className="mt-auto pt-8">
        <h3 className="text-label-sm">{t("eraseTitle")}</h3>
        <p className="mt-1 text-p-sm text-muted">{t("eraseHint")}</p>
        <Button variant="danger-secondary" size="sm" className="mt-3" onClick={() => setErasing(true)}>
          {t("eraseAction")}
        </Button>
      </section>

      {/* In a side panel, so editing never moves the page under it (ADR 0087). */}
      <Dialog open={editing} onClose={() => setEditing(false)} title={t("editTitle")} variant="panel">
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-3 md:px-7">
            {failed && <FormAlert>{tDetail("saveFailed")}</FormAlert>}
            <Field
              label={tForm("customerName")}
              autoComplete="off"
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={errors.fullName}
            />
            <Field
              label={tForm("email")}
              type="email"
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={errors.email}
            />
            <PhoneField
              label={tForm("phone")}
              value={phone}
              onChange={setPhone}
              defaultCountry={country && isSupportedCountry(country) ? country : FALLBACK_COUNTRY}
              error={errors.phone}
            />
            <SelectField
              label={tForm("language")}
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
            >
              {LOCALES.map((option) => (
                <option key={option} value={option}>
                  {languageName(option)}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="flex gap-2 border-t border-border px-6 py-4 md:px-7">
            <Button type="submit" pending={saving} pendingLabel={tDetail("saving")} className="flex-1">
              {tDetail("save")}
            </Button>
            <Button variant="secondary" disabled={saving} onClick={() => setEditing(false)}>
              {tForm("cancel")}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={erasing}
        onClose={() => setErasing(false)}
        title={t("eraseConfirmTitle", { name: customer.fullName })}
        variant="destructive"
      >
        <p className="text-p-sm text-muted">{t("eraseConfirmBody")}</p>
        {openTickets > 0 && (
          <div className="mt-3">
            <FormAlert>{t("eraseOpenTickets", { count: openTickets })}</FormAlert>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" disabled={removing} onClick={() => setErasing(false)}>
            {tForm("cancel")}
          </Button>
          <Button variant="danger" pending={removing} pendingLabel={t("erasing")} onClick={erase}>
            {t("eraseConfirm")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
