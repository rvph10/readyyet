import { NAME_MAX_LENGTH } from "@readyyet/shared";
import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod";

type Message =
  "nameMissing" | "businessTypeMissing" | "locationNameMissing" | "phoneInvalid" | "emailInvalid" | "tooLong";

// Each step's part of POST /businesses, checked before it's sent with the
// page's own messages (ADR 0073). The phone is checked with the library the
// API's @IsPhoneNumber uses, and zod's email check, like @IsEmail, wants a
// domain with its ending.
export function businessStep(t: (key: Message) => string) {
  return z.object({
    name: z.string().trim().min(1, t("nameMissing")).max(NAME_MAX_LENGTH, t("tooLong")),
    location: z.object({
      businessTypeCode: z.string().min(1, t("businessTypeMissing")),
      businessTypeDetail: z
        .string()
        .trim()
        .max(NAME_MAX_LENGTH, t("tooLong"))
        // Optional: left empty, it isn't sent (ADR 0071).
        .transform((detail) => detail || undefined)
        .optional(),
    }),
  });
}

export function locationStep(t: (key: Message) => string) {
  return z.object({
    location: z.object({
      name: z.string().trim().min(1, t("locationNameMissing")).max(NAME_MAX_LENGTH, t("tooLong")),
      contactPhone: z.string().refine((phone) => isValidPhoneNumber(phone), t("phoneInvalid")),
      contactEmail: z
        .string()
        .trim()
        .pipe(z.email(t("emailInvalid"))),
    }),
  });
}

// A later Location's own form, on one page: the same fields, without the Business.
export function newLocation(t: (key: Message) => string) {
  return z.object({ ...businessStep(t).shape.location.shape, ...locationStep(t).shape.location.shape });
}
