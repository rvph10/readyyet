import { Inject, Injectable } from "@nestjs/common";
import { EmailStatus } from "@readyyet/db";
import type { PrismaClient } from "@readyyet/db";
import { render } from "@react-email/render";
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
      data: { to: input.to, subject: input.subject, type: input.type, html, text, status: EmailStatus.QUEUED },
    });

    return this.attempt(log.id, input.to, input.subject, html, text);
  }

  // Re-attempts an existing row (used by EmailRetryService's cron sweep)
  // from its already-persisted content, rather than needing the original
  // caller's react element again.
  async retry(logId: string, to: string, subject: string, html: string | null, text: string | null) {
    return this.attempt(logId, to, subject, html ?? undefined, text ?? undefined);
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

  private async attempt(
    logId: string,
    to: string,
    subject: string,
    html: string | undefined,
    text: string | undefined,
  ) {
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
            from: process.env.EMAIL_FROM as string,
            to,
            subject,
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
