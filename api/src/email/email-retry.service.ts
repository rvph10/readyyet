import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { EmailStatus } from "@readyyet/db";
import { PrismaService } from "../database/prisma.service";
import { EmailService, MAX_TOTAL_ATTEMPTS } from "./email.service";

// Don't hammer Resend immediately after a row's own in-process retries
// (EmailService.attempt) already just failed.
const RETRY_COOLDOWN_MS = 60_000;

@Injectable()
export class EmailRetryService {
  private readonly logger = new Logger(EmailRetryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  @Cron("*/5 * * * *")
  async sweep() {
    const cutoff = new Date(Date.now() - RETRY_COOLDOWN_MS);
    const stuck = await this.prisma.emailLog.findMany({
      where: {
        status: { in: [EmailStatus.QUEUED, EmailStatus.FAILED] },
        attempts: { lt: MAX_TOTAL_ATTEMPTS },
        OR: [{ lastAttemptAt: null }, { lastAttemptAt: { lt: cutoff } }],
      },
    });

    for (const log of stuck) {
      this.logger.log(`Retrying email ${log.id} (attempts so far: ${log.attempts})`);
      await this.email.retry(log.id, log.to, log.subject, log.html, log.text);
    }
  }
}
