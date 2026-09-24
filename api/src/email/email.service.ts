import { render } from "react-email";
import { Inject, Injectable } from "@nestjs/common";
import { EmailStatus } from "@readyyet/db";
import type { EmailLog, PrismaClient } from "@readyyet/db";
import type { ReactElement } from "react";
import { PrismaService } from "../database/prisma.service";
import { NON_RETRYABLE_RESEND_ERRORS } from "./email-status";
import { getResendClient, waitForResendSlot } from "./resend-client";

// Immediate, in-process retries for transient failures (rate limit, a
// blip in Resend's API). MAX_TOTAL_ATTEMPTS is the overall ceiling
// EmailRetryService's cron sweep also respects, each sweep re-runs this
// same up-to-3-attempt loop, so the true ceiling is approximate, not
// exact, good enough to eventually stop retrying a truly dead send.
const MAX_IMMEDIATE_ATTEMPTS = 3;
const IMMEDIATE_BACKOFF_MS = [0, 500, 1500];
export const MAX_TOTAL_ATTEMPTS = 9;

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
}

type StoredMessage = Pick<EmailLog, "id" | "to" | "subject" | "html" | "text" | "fromName" | "replyTo" | "headers">;

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
    const { html, text } = await this.resolveContent(input);

    const log = await this.prisma.emailLog.create({
      data: {
        to: input.to,
        subject: input.subject,
        type: input.type,
        html,
        text,
        fromName: input.fromName,
        replyTo: input.replyTo,
        headers: input.headers,
        status: EmailStatus.QUEUED,
      },
    });

    return this.attempt(log);
  }

  // Re-attempts an existing row (used by EmailRetryService's cron sweep)
  // from its already-persisted content, rather than needing the original
  // caller's react element again.
  async retry(log: StoredMessage) {
    return this.attempt(log);
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
    const { id: logId, to, subject, html, text } = message;
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
            ...(html ? { html } : { text: text! }),
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
          break;
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
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
