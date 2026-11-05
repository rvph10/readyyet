import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { EmailStatus, type Prisma } from "@readyyet/db";
import { CronMonitor } from "../common/decorators/cron-monitor.decorator";
import { PrismaService } from "../database/prisma.service";
import { GIVE_UP_AFTER_MS } from "./email-status";
import { EmailService } from "./email.service";

// Doubled per round of attempts, each round being up to 3 of them
// (EmailService.attempt), so a long outage costs few calls.
const FIRST_RETRY_DELAY_MS = 60_000;
const LONGEST_RETRY_DELAY_MS = 2 * 60 * 60 * 1000;
const ATTEMPTS_PER_ROUND = 3;

const STUCK_INCLUDE = {
  ticket: {
    select: {
      notificationsStoppedAt: true,
      customer: { select: { email: true, emailBouncedAt: true, emailComplainedAt: true } },
      location: { select: { deletedAt: true } },
      statusEvents: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
  },
} satisfies Prisma.EmailLogInclude;
type StuckEmail = Prisma.EmailLogGetPayload<{ include: typeof STUCK_INCLUDE }>;

// Hours may have passed since it was written: staff may have corrected the
// address, the Customer may be erased or have stopped updates, and a Status email
// mustn't arrive after the Ticket has moved on (ADR 0015).
function stillWanted({ ticket, to, type, createdAt }: StuckEmail) {
  if (!ticket) {
    return true;
  }
  const { customer, location, notificationsStoppedAt, statusEvents } = ticket;
  if (customer.email !== to || customer.emailBouncedAt || customer.emailComplainedAt || location.deletedAt) {
    return false;
  }
  if (type === "ticket_tracking_link") {
    return true;
  }
  if (notificationsStoppedAt) {
    return false;
  }
  return type !== "ticket_status_update" || statusEvents[0].createdAt <= createdAt;
}

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
      include: STUCK_INCLUDE,
    });

    for (const log of stuck) {
      const lastTried = log.lastAttemptAt ?? log.createdAt;
      const deadline = log.createdAt.getTime() + GIVE_UP_AFTER_MS;
      if (log.resendId) {
        // Resend took it and later reported it failed. Sending it again with
        // its idempotency key would only replay that first answer.
        await this.email.giveUp(log);
      } else if (!stillWanted(log)) {
        await this.prisma.emailLog.update({ where: { id: log.id }, data: { gaveUpAt: new Date() } });
      } else if (log.lastAttemptAt && log.lastAttemptAt.getTime() > deadline) {
        this.logger.error(`Giving up on email ${log.id} after ${log.attempts} attempts`);
        await this.email.giveUp(log);
      } else if (now > deadline || now - lastTried.getTime() >= retryDelay(log.attempts)) {
        // Past the deadline it gets one last round, whatever the backoff says,
        // Resend may have been fine for an hour already.
        this.logger.log(`Retrying email ${log.id} (attempts so far: ${log.attempts})`);
        await this.email.retry(log);
      }
    }
  }
}
