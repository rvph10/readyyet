import { EmailStatus } from "@readyyet/db";
import type { WebhookEvent } from "resend";

// Resend error names not worth retrying right away (bad input, bad credentials,
// protocol misuse), as opposed to transient ones (rate limits, quota, internal
// errors). EmailRetryService's sweep tries both again later, as credentials can
// be fixed.
export const NON_RETRYABLE_RESEND_ERRORS = new Set([
  "validation_error",
  "invalid_parameter",
  "missing_required_field",
  "invalid_attachment",
  "invalid_from_address",
  "invalid_access",
  "invalid_api_key",
  "restricted_api_key",
  "missing_api_key",
  "security_error",
  "not_found",
  "method_not_allowed",
  "invalid_idempotency_key",
  "invalid_idempotent_request",
]);

export const WEBHOOK_EVENT_TO_STATUS: Partial<Record<WebhookEvent, EmailStatus>> = {
  "email.sent": EmailStatus.SENT,
  "email.delivered": EmailStatus.DELIVERED,
  "email.delivery_delayed": EmailStatus.DELAYED,
  "email.bounced": EmailStatus.BOUNCED,
  "email.complained": EmailStatus.COMPLAINED,
  // Refused by Resend because the address bounced or complained before,
  // never delivered and never worth retrying.
  "email.suppressed": EmailStatus.BOUNCED,
  "email.failed": EmailStatus.FAILED,
};

// How long an email keeps its chance (ADR 0081). An outage can last hours, past
// a day the email is out of date.
export const GIVE_UP_AFTER_MS = 24 * 60 * 60 * 1000;
