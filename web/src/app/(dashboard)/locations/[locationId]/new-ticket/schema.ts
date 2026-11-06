import { DESCRIPTION_MAX_LENGTH, NAME_MAX_LENGTH, TITLE_MAX_LENGTH } from "@readyyet/shared";
import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod";

type Message =
  | "nameMissing"
  | "nameTooLong"
  | "emailInvalid"
  | "phoneInvalid"
  | "titleMissing"
  | "titleTooLong"
  | "notesTooLong"
  | "datePast";

// Shaped like POST /locations/:id/tickets, its limits and checks the API's
// (ADR 0073). `today` is on the Location's clock, which the API checks against.
export function ticketSchema(t: (key: Message) => string, today: string) {
  return z.object({
    title: z.string().trim().min(1, t("titleMissing")).max(TITLE_MAX_LENGTH, t("titleTooLong")),
    description: z
      .string()
      .trim()
      .max(DESCRIPTION_MAX_LENGTH, t("notesTooLong"))
      .transform((notes) => notes || undefined),
    // Sent even when empty: left out, the API would fill in the turnaround
    // date that staff just cleared (ADR 0036).
    estimatedReadyDate: z
      .string()
      .refine((date) => !date || date >= today, t("datePast"))
      .transform((date) => date || null),
  });
}

export function newCustomerSchema(t: (key: Message) => string) {
  return z.object({
    customer: z.object({
      fullName: z.string().trim().min(1, t("nameMissing")).max(NAME_MAX_LENGTH, t("nameTooLong")),
      email: z
        .string()
        .trim()
        .pipe(z.union([z.literal(""), z.email(t("emailInvalid"))]))
        .transform((email) => email || undefined),
      phone: z
        .string()
        .refine((phone) => !phone || isValidPhoneNumber(phone), t("phoneInvalid"))
        .transform((phone) => phone || undefined),
    }),
  });
}
