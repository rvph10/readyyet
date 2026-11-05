import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { EmailStatus } from "@readyyet/db";
import { CronMonitor } from "../common/decorators/cron-monitor.decorator";
import { PrismaService } from "../database/prisma.service";
import { EmailService } from "./email.service";

// An outage can last hours, so the email keeps its chance for a day. After
// that, staff have long told the Customer themselves or it's out of date.
const GIVE_UP_AFTER_MS = 24 * 60 * 60 * 1000;
// Doubled per round of attempts, each round being up to 3 of them
// (EmailService.attempt), so a long outage costs few calls.
const FIRST_RETRY_DELAY_MS = 60_000;
const LONGEST_RETRY_DELAY_MS = 2 * 60 * 60 * 1000;
const ATTEMPTS_PER_ROUND = 3;

function retryDelay(attempts: number) {
  const rounds = Math.ceil(attempts / ATTEMPTS_PER_ROUND);
  return Math.min(FIRST_RETRY_DELAY_MS * 2 ** Math.max(rounds - 1, 0), LONGEST_RETRY_DELAY_MS);
}

@Injectable()
export class EmailRetryService {
  private readonly logger = new Logger(EmailRetryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  @Cron("*/5 * * * *")
  // Alerts when a sweep is missed or runs too long, not only when one throws.
  @CronMonitor("email-retry-sweep", {
    schedule: { type: "crontab", value: "*/5 * * * *" },
    checkinMargin: 2,
    maxRuntime: 10,
  })
  async sweep() {
    const now = Date.now();
    const stuck = await this.prisma.emailLog.findMany({
      where: {
        status: { in: [EmailStatus.QUEUED, EmailStatus.FAILED] },
        gaveUpAt: null,
        // A sign-in code expires in 5 minutes, one sent by a later sweep
        // would already be dead. The User asks for a new one instead.
        type: { not: "auth_otp" },
      },
    });

    for (const log of stuck) {
      if (now - log.createdAt.getTime() > GIVE_UP_AFTER_MS) {
        this.logger.error(`Giving up on email ${log.id} after ${log.attempts} attempts`);
        await this.email.giveUp(log);
      } else if (!log.lastAttemptAt || now - log.lastAttemptAt.getTime() >= retryDelay(log.attempts)) {
        this.logger.log(`Retrying email ${log.id} (attempts so far: ${log.attempts})`);
        await this.email.retry(log);
      }
    }
  }
}
