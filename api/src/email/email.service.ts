import * as Sentry from "@sentry/nestjs";
import { render } from "react-email";
import { Inject, Injectable } from "@nestjs/common";
import { EmailStatus, Prisma } from "@readyyet/db";
import type { EmailLog, PrismaClient } from "@readyyet/db";
import type { ReactElement } from "react";
import { PrismaService } from "../database/prisma.service";
import { NON_RETRYABLE_RESEND_ERRORS } from "./email-status";
import { getResendClient, waitForResendSlot } from "./resend-client";

// Immediate, in-process retries for transient failures (rate limit, a
// blip in Resend's API). EmailRetryService's cron sweep re-runs this same
// up-to-3-attempt loop later (ADR 0081).
const MAX_IMMEDIATE_ATTEMPTS = 3;
const IMMEDIATE_BACKOFF_MS = [0, 500, 1500];

// Stored with the email, so content is base64 text rather than a Buffer.
export interface EmailAttachment {
  filename: string;
  content: string;
  contentType: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  // App-defined category (e.g. "welcome", "auth_otp"), not a Prisma enum,
  // see EmailLog's schema comment.
  type: string;
  html?: string;
  text?: string;
  react?: ReactElement;
  // Display name shown instead of EMAIL_FROM's own, the address stays
  // EMAIL_FROM's (it's the one verified in Resend).
  fromName?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  attachments?: EmailAttachment[];
  // The Ticket it's about, checked again before a late retry.
  ticketId?: bigint;
  invitationId?: string;
  // A second send with the same key returns the first, whose retries belong to
  // EmailRetryService, instead of being a new email with its own idempotency key.
  dedupeKey?: string;
}

type StoredMessage = Pick<
  EmailLog,
  "id" | "type" | "to" | "subject" | "html" | "text" | "fromName" | "replyTo" | "headers" | "attachments"
>;

// fromName is user input (a Location's name): quoted so a comma or angle
// bracket in it can't be read as another address, and line breaks
// removed so it can't inject a header.
function sender(fromName: string | null): string {
  const from = process.env.EMAIL_FROM as string;
  if (!fromName) {
    return from;
  }
  const address = /<([^>]+)>/.exec(from)?.[1] ?? from;
  const name = fromName.replace(/[\r\n]+/g, " ").replace(/["\\]/g, "\\$&");
  return `"${name}" <${address}>`;
}

// Only the error's name: its message can quote the address, and the row's id
// leads to everything else.
function report(what: string, emailLogId: string, lastError: string | null) {
  Sentry.captureMessage(`${what}: ${lastError?.split(":")[0] ?? "no error recorded"}`, {
    level: "error",
    extra: { emailLogId },
  });
}

@Injectable()
export class EmailService {
  // Typed as the wider PrismaClient, not PrismaService: auth.ts
  // constructs this class directly outside Nest's DI container (it's
  // evaluated at module load, before Nest even exists, see ADR 0008),
  // passing its own already-constructed PrismaClient. Nest's DI resolves
  // by exact class token though, not by supertype, so @Inject(PrismaService)
  // is still needed to tell it which provider to hand in here.
  constructor(@Inject(PrismaService) private readonly prisma: PrismaClient) {}

  async send(input: SendEmailInput) {
    if (input.dedupeKey) {
      const first = await this.prisma.emailLog.findUnique({ where: { dedupeKey: input.dedupeKey } });
      if (first) {
        return first;
      }
    }
    const { html, text } = await this.resolveContent(input);

    const log = await this.prisma.$transaction(async (tx) => {
      // Locks the Customer against an erasure running now, which either waits
      // and then clears this row too, or has finished and this isn't written.
      if (input.ticketId) {
        const [customer] = await tx.$queryRaw<{ deleted_at: Date | null }[]>`
          SELECT c.deleted_at FROM customer c
          JOIN ticket t ON t.customer_id = c.id
          WHERE t.id = ${input.ticketId}
          FOR SHARE OF c`;
        if (customer.deleted_at) {
          return null;
        }
      }
      return tx.emailLog.create({
        data: {
          to: input.to,
          subject: input.subject,
          type: input.type,
          html,
          text,
          fromName: input.fromName,
          replyTo: input.replyTo,
          headers: input.headers,
          attachments: input.attachments as unknown as Prisma.InputJsonValue | undefined,
          ticketId: input.ticketId,
          invitationId: input.invitationId,
          dedupeKey: input.dedupeKey,
          status: EmailStatus.QUEUED,
        },
      });
    });

    return log && this.attempt(log);
  }

  // Re-attempts an existing row (used by EmailRetryService's cron sweep)
  // from its already-persisted content, rather than needing the original
  // caller's react element again.
  async retry(log: StoredMessage) {
    // The sweep's list can be minutes old by now, and an erasure gives up on
    // an email in the same step that clears it.
    const { gaveUpAt } = await this.prisma.emailLog.findUniqueOrThrow({
      where: { id: log.id },
      select: { gaveUpAt: true },
    });
    return gaveUpAt ? null : this.attempt(log);
  }

  // Nothing else will try again, so someone has to hear about it.
  async giveUp(log: Pick<EmailLog, "id" | "type" | "lastError">) {
    await this.prisma.emailLog.update({ where: { id: log.id }, data: { gaveUpAt: new Date() } });
    report(`Gave up on a ${log.type} email`, log.id, log.lastError);
  }

  private async resolveContent(input: SendEmailInput): Promise<{ html?: string; text?: string }> {
    if (input.react) {
      return { html: await render(input.react), text: await render(input.react, { plainText: true }) };
    }
    if (!input.html && !input.text) {
      throw new Error("EmailService.send requires one of react, html, or text");
    }
    return { html: input.html, text: input.text };
  }

  private async attempt(message: StoredMessage) {
    const { id: logId, type, to, subject, html, text } = message;
    let lastError = "";

    for (let i = 0; i < MAX_IMMEDIATE_ATTEMPTS; i++) {
      if (IMMEDIATE_BACKOFF_MS[i] > 0) {
        await this.delay(IMMEDIATE_BACKOFF_MS[i]);
      }
      await this.prisma.emailLog.update({ where: { id: logId }, data: { attempts: { increment: 1 } } });

      try {
        await waitForResendSlot();
        const { data, error } = await getResendClient().emails.send(
          {
            from: sender(message.fromName),
            to,
            subject,
            ...(message.replyTo && { replyTo: message.replyTo }),
            ...(message.headers && { headers: message.headers as Record<string, string> }),
            ...(message.attachments && { attachments: message.attachments as unknown as EmailAttachment[] }),
            // Both, so a mail app that can't or won't show HTML still has the
            // whole message (ADR 0127).
            ...(html ? { html, ...(text && { text }) } : { text: text! }),
          },
          { idempotencyKey: logId },
        );

        if (!error) {
          return this.prisma.emailLog.update({
            where: { id: logId },
            data: { status: EmailStatus.SENT, resendId: data.id, lastAttemptAt: new Date() },
          });
        }

        lastError = `${error.name}: ${error.message}`;
        if (NON_RETRYABLE_RESEND_ERRORS.has(error.name)) {
          // Often our own setup, like a rotated API key, so someone should know
          // now. It's still retried: once that's fixed, the email can go.
          report(`A ${type} email was refused`, logId, lastError);
          break;
        }
      } catch (err) {
        // Named like Resend's errors above, as report() only sends what's before the colon.
        lastError = err instanceof Error ? `${err.name}: ${err.message}` : `Error: ${String(err)}`;
      }
    }

    return this.prisma.emailLog.update({
      where: { id: logId },
      data: { status: EmailStatus.FAILED, lastError, lastAttemptAt: new Date() },
    });
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
