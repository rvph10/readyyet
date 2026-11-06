import { NAME_MAX_LENGTH } from "@readyyet/shared";
import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod";

type Message = "nameMissing" | "tooLong" | "phoneInvalid" | "emailInvalid" | "addressIncomplete" | "turnaroundInvalid";

const MAX_TURNAROUND_DAYS = 60;

// Shaped for PATCH /locations/:id, its limits the API's (ADR 0073). An address
// is all four parts or none (ADR 0034), and the country always has a value.
export function shopSchema(t: (key: Message) => string) {
  const part = (max: number) => z.string().trim().max(max, t("tooLong"));
  return z
    .object({
      name: z.string().trim().min(1, t("nameMissing")).max(NAME_MAX_LENGTH, t("tooLong")),
      contactPhone: z.string().refine((phone) => isValidPhoneNumber(phone), t("phoneInvalid")),
      contactEmail: z
        .string()
        .trim()
        .pipe(z.email(t("emailInvalid"))),
      streetAddress: part(200),
      postalCode: part(20),
      addressLocality: part(100),
      addressCountry: z.string(),
    })
    .superRefine(({ streetAddress, postalCode, addressLocality }, context) => {
      const parts = { streetAddress, postalCode, addressLocality };
      if (!Object.values(parts).some(Boolean)) return;
      for (const [key, value] of Object.entries(parts)) {
        if (!value) context.addIssue({ code: "custom", path: [key], message: t("addressIncomplete") });
      }
    });
}

// Empty stops prefilling a new Ticket's date (ADR 0036).
export function turnaroundSchema(t: (key: Message) => string) {
  return z
    .string()
    .trim()
    .refine((days) => !days || (/^\d+$/.test(days) && Number(days) >= 1 && Number(days) <= MAX_TURNAROUND_DAYS), {
      error: t("turnaroundInvalid"),
    })
    .transform((days) => (days ? Number(days) : null));
}
