import { EmailStatus } from "@readyyet/db";
import type { WebhookEvent } from "resend";

// Resend error names that will never succeed on retry (bad input, bad
// credentials, protocol misuse), as opposed to transient ones
// (rate limits, quota, internal errors) that are worth retrying both
// immediately and later via EmailRetryService's sweep.
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
