"use client";

import { NAME_MAX_LENGTH, DESCRIPTION_MAX_LENGTH, LOCALES, TITLE_MAX_LENGTH } from "@readyyet/shared";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { isSupportedCountry } from "react-phone-number-input";
import { PhoneField } from "@/components/phone-field";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Panel } from "@/components/ui/panel";
import type { ActionFailure } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";
import { fieldErrors } from "@/lib/validation";
import { createTicket, findCustomers } from "./actions";
import { newCustomerSchema, ticketSchema } from "./schema";

type Customer = components["schemas"]["CustomerDto"];

const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_FROM_LETTERS = 2;
const FALLBACK_COUNTRY = "BE";

function CustomerRow({ customer }: { customer: Customer }) {
  const t = useTranslations("tickets.form");
  return (
    <>
      <Avatar id={customer.id} name={customer.fullName} src={null} size="sm" />
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-label-sm wrap-anywhere">{customer.fullName}</span>
        <span className="block text-p-xs wrap-anywhere text-muted">
          {customer.email ?? customer.phone ?? t("noContact")}
        </span>
      </span>
    </>
  );
}

interface Props {
  locationId: string;
  today: string;
  // The Location's turnaround date (ADR 0036), or empty without one.
  suggestedDate: string;
  // The Location's language, which applies to a Customer left on it.
  locationLocale: string;
  country: string | undefined;
}

// Whoever works the counter fills this in with someone waiting, so one field
// both finds a returning Customer and starts a new one. The form is checked by
// its schemas, then by the API, whose refusals land in the same places.
export function TicketForm({ locationId, today, suggestedDate, locationLocale, country }: Props) {
  const t = useTranslations("tickets.form");
  const pageLocale = useLocale();
  const [chosen, setChosen] = useState<Customer | null>(null);
  const [fullName, setFullName] = useState("");
  const [matches, setMatches] = useState<Customer[]>([]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [locale, setLocale] = useState(locationLocale);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(suggestedDate);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  const query = chosen ? "" : fullName.trim();

  useEffect(() => {
    if (query.length < SEARCH_FROM_LETTERS) return;
    let current = true;
    const timer = setTimeout(() => {
      void findCustomers(locationId, query).then((found) => {
        if (current) setMatches(found);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query, locationId]);

  const errorFor = (field: string) => errors[field] ?? (failure?.fields?.[field] ? t("invalid") : null);

  function edited(field: string) {
    setErrors((shown) => {
      const rest = { ...shown };
      delete rest[field];
      return rest;
    });
  }

  function choose(customer: Customer) {
    setChosen(customer);
    setMatches([]);
    edited("customer.fullName");
  }

  function unchoose() {
    setChosen(null);
    setFullName("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ticket = ticketSchema(t, today).safeParse({ title, description, estimatedReadyDate: date });
    const customer = chosen ? null : newCustomerSchema(t).safeParse({ customer: { fullName, email, phone } });
    setErrors({
      ...(ticket.success ? {} : fieldErrors(ticket.error)),
      ...(customer && !customer.success ? fieldErrors(customer.error) : {}),
    });
    if (!ticket.success || (customer && !customer.success)) return;
    setFailure(null);
    startTransition(async () => {
      const result = await createTicket(locationId, {
        ...ticket.data,
        ...(customer
          ? {
              customer: {
                ...customer.data.customer,
                // Left on the Location's, it follows the Location if that changes.
                locale: locale === locationLocale ? undefined : (locale as "EN" | "FR"),
              },
            }
          : { customerId: chosen!.id }),
      });
      if (!result.ok) setFailure(result);
    });
  }

  const emailed = chosen ? chosen.email : email.trim();
  const emailFails = chosen && (chosen.emailBouncedAt || chosen.emailComplainedAt);
  const failureMessage =
    failure &&
    !failure.fields &&
    t(failure.code === "LOCATION_FROZEN" ? "frozen" : failure.code === "RATE_LIMITED" ? "rateLimited" : "unexpected");
  const languageNames = new Intl.DisplayNames([pageLocale], { type: "language" });
  const shown = query.length < SEARCH_FROM_LETTERS ? [] : matches;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {failureMessage && <FormAlert>{failureMessage}</FormAlert>}
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel as="section" aria-labelledby="ticket-customer" className="min-w-0 md:p-6">
          <h2 id="ticket-customer" className="mb-4 text-label-lg">
            {t("customerSection")}
          </h2>
          {chosen ? (
            <div className="flex items-center gap-3 rounded-2xl bg-subtle p-3">
              <CustomerRow customer={chosen} />
              <Button variant="secondary" size="sm" onClick={unchoose}>
                {t("change")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <Field
                  label={t("customerName")}
                  placeholder={t("customerNamePlaceholder")}
                  autoComplete="off"
                  autoFocus
                  maxLength={NAME_MAX_LENGTH}
                  value={fullName}
                  onChange={(event) => {
                    setFullName(event.target.value);
                    edited("customer.fullName");
                  }}
                  error={errorFor("customer.fullName")}
                />
                {shown.length > 0 && (
                  <div className="mt-2 rounded-2xl border border-border p-1.5">
                    <p className="px-2.5 pt-1 pb-1.5 text-label-xs text-muted">{t("existing")}</p>
                    <ul>
                      {shown.map((customer) => (
                        <li key={customer.id}>
                          <button
                            type="button"
                            onClick={() => choose(customer)}
                            className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-subtle"
                          >
                            <CustomerRow customer={customer} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <Field
                label={t("email")}
                type="email"
                autoComplete="off"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  edited("customer.email");
                }}
                error={errorFor("customer.email")}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <PhoneField
                  label={t("phone")}
                  value={phone}
                  onChange={(value) => {
                    setPhone(value);
                    edited("customer.phone");
                  }}
                  defaultCountry={country && isSupportedCountry(country) ? country : FALLBACK_COUNTRY}
                  error={errorFor("customer.phone")}
                />
                <SelectField label={t("language")} value={locale} onChange={(event) => setLocale(event.target.value)}>
                  {LOCALES.map((option) => (
                    <option key={option} value={option}>
                      {languageNames.of(option.toLowerCase())}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>
          )}
        </Panel>
        <Panel as="section" aria-labelledby="ticket-job" className="flex min-w-0 flex-col gap-4 md:p-6">
          <h2 id="ticket-job" className="text-label-lg">
            {t("jobSection")}
          </h2>
          <Field
            label={t("title")}
            hint={t("titleHint")}
            placeholder={t("titlePlaceholder")}
            autoComplete="off"
            maxLength={TITLE_MAX_LENGTH}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              edited("title");
            }}
            error={errorFor("title")}
          />
          <TextareaField
            label={t("notes")}
            hint={t("notesHint")}
            placeholder={t("notesPlaceholder")}
            maxLength={DESCRIPTION_MAX_LENGTH}
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              edited("description");
            }}
            error={errorFor("description")}
          />
          <Field
            label={t("date")}
            hint={t("dateHint")}
            type="date"
            min={today}
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              edited("estimatedReadyDate");
            }}
            error={errorFor("estimatedReadyDate")}
          />
        </Panel>
      </div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p role="status" className="min-w-0 text-p-sm wrap-anywhere text-muted">
          {emailFails
            ? t("emailFails", { email: chosen.email ?? "" })
            : emailed
              ? t("willEmail", { email: emailed })
              : t("noEmail")}
        </p>
        <div className="grid shrink-0 grid-cols-2 gap-3 md:flex">
          <Link href={`/locations/${locationId}`} className={buttonClass({ variant: "secondary" })}>
            {t("cancel")}
          </Link>
          <Button type="submit" pending={pending} pendingLabel={t("creating")}>
            {t("create")}
          </Button>
        </div>
      </div>
    </form>
  );
}
