"use client";

import { calendarDateIn, DESCRIPTION_MAX_LENGTH, LOCALES, NAME_MAX_LENGTH, TITLE_MAX_LENGTH } from "@readyyet/shared";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { isSupportedCountry } from "react-phone-number-input";
import { PhoneField } from "@/components/phone-field";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import type { ActionFailure } from "@/lib/api/errors";
import { orFailure } from "@/lib/api/or-failure";
import type { components } from "@/lib/api/schema";
import { fieldErrors } from "@/lib/validation";
import { createTicket } from "./actions";
import type { CreatedTicket, NewTicketProps } from "./new-ticket-panel";
import { newCustomerSchema, ticketSchema } from "./schema";
import { useCustomerLookup } from "./use-customer-lookup";

type Customer = components["schemas"]["CustomerDto"];

const SEARCH_FROM_LETTERS = 2;
// Part of an address says little, and so does a dialling code, which a phone
// field starts on: "+32" alone would match half the list.
const SEARCH_FROM_EMAIL_LETTERS = 4;
const SEARCH_FROM_PHONE_CHARACTERS = 8;
const FALLBACK_COUNTRY = "BE";
const SHOWN_FIELDS = [
  "customer.fullName",
  "customer.email",
  "customer.phone",
  "title",
  "description",
  "estimatedReadyDate",
];

const FAILURE_MESSAGES: Partial<Record<string, "frozen" | "rateLimited" | "notConfirmed">> = {
  LOCATION_FROZEN: "frozen",
  RATE_LIMITED: "rateLimited",
  // The answer was lost, not necessarily the Ticket, and a second try would
  // send the Customer a second email.
  INTERNAL_ERROR: "notConfirmed",
};

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

interface Props extends NewTicketProps {
  // Already chosen when it opens, from their own page.
  customer: Customer | null;
  onCreated: (ticket: CreatedTicket) => void;
  onCancel: () => void;
}

// Whoever works the counter fills this in with someone waiting, so one field
// both finds a returning Customer and starts a new one. The form is checked by
// its schemas, then by the API, whose refusals land in the same places.
export function TicketForm({
  locationId,
  timeZone,
  today,
  suggestedDate,
  locationLocale,
  country,
  customer: startingCustomer,
  onCreated,
  onCancel,
}: Props) {
  const t = useTranslations("tickets.form");
  const pageLocale = useLocale();
  const [chosen, setChosen] = useState(startingCustomer);
  const [fullName, setFullName] = useState("");
  // Whichever was typed in last looks for a returning Customer.
  const [lookingBy, setLookingBy] = useState<"name" | "email" | "phone">("name");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [locale, setLocale] = useState(locationLocale);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(suggestedDate);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [customerGone, setCustomerGone] = useState(false);
  const [pending, startTransition] = useTransition();

  const lookups = {
    name: { value: fullName.trim(), from: SEARCH_FROM_LETTERS },
    email: { value: email.trim(), from: SEARCH_FROM_EMAIL_LETTERS },
    phone: { value: phone, from: SEARCH_FROM_PHONE_CHARACTERS },
  };
  const lookup = lookups[lookingBy];
  const shown = useCustomerLookup(locationId, !chosen && lookup.value.length >= lookup.from ? lookup.value : "");

  const errorFor = (field: string) => errors[field] ?? (failure?.fields?.[field] ? t("invalid") : null);

  // Only that field's error goes, the API may have refused others too. Once no
  // field of the page is left, the rest of the refusal has nothing more to say.
  function edited(field: string) {
    setCustomerGone(false);
    setFailure((refused) => {
      const fields = { ...refused?.fields };
      delete fields[field];
      return refused && SHOWN_FIELDS.some((name) => fields[name]) ? { ...refused, fields } : null;
    });
    setErrors((shown) => {
      const rest = { ...shown };
      delete rest[field];
      return rest;
    });
  }

  function clearCustomerErrors() {
    setFailure(null);
    setCustomerGone(false);
    setErrors(({ title, description, estimatedReadyDate }) => ({
      ...(title && { title }),
      ...(description && { description }),
      ...(estimatedReadyDate && { estimatedReadyDate }),
    }));
  }

  function choose(customer: Customer) {
    setChosen(customer);
    clearCustomerErrors();
  }

  // Everything goes with the name, what was typed before choosing someone must
  // not end up on the next Customer, who'd have their tracking link sent there.
  function unchoose() {
    setChosen(null);
    setFullName("");
    setEmail("");
    setPhone("");
    setLocale(locationLocale);
    clearCustomerErrors();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Now, not when the page opened: it may have stayed open overnight.
    const now = calendarDateIn(new Date(), timeZone);
    const ticket = ticketSchema(t, now).safeParse({ title, description, estimatedReadyDate: date });
    const customer = chosen ? null : newCustomerSchema(t).safeParse({ customer: { fullName, email, phone } });
    setErrors({
      ...(ticket.success ? {} : fieldErrors(ticket.error)),
      ...(customer && !customer.success ? fieldErrors(customer.error) : {}),
    });
    setFailure(null);
    setCustomerGone(false);
    if (!ticket.success || (customer && !customer.success)) return;
    startTransition(async () => {
      const result = await orFailure(
        createTicket(locationId, {
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
        }),
      );
      if (result.ok) {
        onCreated(result);
        return;
      }
      setFailure(result);
      // Erased by a colleague since being chosen, retrying can't work.
      if (result.code === "NOT_FOUND" && chosen) {
        unchoose();
        setCustomerGone(true);
      }
    });
  }

  const emailed = chosen ? chosen.email : email.trim();
  const emailFails = chosen && (chosen.emailBouncedAt || chosen.emailComplainedAt);
  // A refusal of a field nothing here shows still has to say something.
  const failureMessage = customerGone
    ? t("customerGone")
    : failure &&
      !SHOWN_FIELDS.some((field) => failure.fields?.[field]) &&
      t(FAILURE_MESSAGES[failure.code] ?? "unexpected");
  const languageNames = new Intl.DisplayNames([pageLocale], { type: "language" });
  const matches = shown.length > 0 && (
    <div className="mt-2 rounded-card border border-border p-1.5">
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
  );

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-3 md:px-7">
        {failureMessage && <FormAlert>{failureMessage}</FormAlert>}
        <section aria-labelledby="ticket-customer" className="min-w-0">
          <h3 id="ticket-customer" className="sr-only">
            {t("customerSection")}
          </h3>
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
                    setLookingBy("name");
                    edited("customer.fullName");
                  }}
                  error={errorFor("customer.fullName")}
                />
                {lookingBy === "name" && matches}
              </div>
              <div>
                <Field
                  label={t("email")}
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setLookingBy("email");
                    edited("customer.email");
                  }}
                  error={errorFor("customer.email")}
                />
                {lookingBy === "email" && matches}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <PhoneField
                  label={t("phone")}
                  value={phone}
                  onChange={(value) => {
                    setPhone(value);
                    setLookingBy("phone");
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
              {lookingBy === "phone" && matches}
            </div>
          )}
        </section>
        <section aria-labelledby="ticket-details" className="flex min-w-0 flex-col gap-4 border-t border-border pt-5">
          <h3 id="ticket-details" className="sr-only">
            {t("ticketSection")}
          </h3>
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
          <DateField
            label={t("date")}
            hint={t("dateHint")}
            today={today}
            min={today}
            value={date}
            onChange={(value) => {
              setDate(value);
              edited("estimatedReadyDate");
            }}
            error={errorFor("estimatedReadyDate")}
          />
        </section>
      </div>
      <div className="flex flex-col gap-3 border-t border-border px-6 py-4 md:px-7">
        <p role="status" className="min-w-0 text-p-xs wrap-anywhere text-muted">
          {emailFails
            ? t("emailFails", { email: chosen.email ?? "" })
            : emailed
              ? t("willEmail", { email: emailed })
              : t("noEmail")}
        </p>
        <div className="flex gap-2">
          <Button type="submit" pending={pending} pendingLabel={t("creating")} className="flex-1">
            {t("create")}
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            {t("cancel")}
          </Button>
        </div>
      </div>
    </form>
  );
}
