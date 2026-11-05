import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { EmailStatus, InvitationStatus, type Prisma } from "@readyyet/db";
import { showsEstimatedReadyDate } from "@readyyet/shared";
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
      customerCollectedAt: true,
      currentStatus: { select: { code: true } },
      customer: { select: { email: true, emailBouncedAt: true, emailComplainedAt: true } },
      location: { select: { deletedAt: true } },
      statusEvents: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      emailLogs: {
        where: { type: "ticket_ready_date_changed" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  },
  invitation: { select: { status: true, expiresAt: true, location: { select: { deletedAt: true } } } },
} satisfies Prisma.EmailLogInclude;
type StuckEmail = Prisma.EmailLogGetPayload<{ include: typeof STUCK_INCLUDE }>;

// Hours may have passed since it was written: staff may have corrected the
// address, the Customer may be erased or have stopped updates, an email must
// not arrive after what it says has stopped being true (ADR 0015), and an
// invitation may have been revoked.
function stillWanted({ ticket, invitation, to, type, createdAt }: StuckEmail) {
  if (type === "invitation") {
    return (
      invitation?.status === InvitationStatus.PENDING &&
      invitation.expiresAt > new Date() &&
      !invitation.location.deletedAt
    );
  }
  // A copy for staff, nothing about the Customer's address applies. Erasure
  // gives up on it itself.
  if (!ticket || type === "feedback_received") {
    return true;
  }
  const { currentStatus, customer, customerCollectedAt, emailLogs, location, notificationsStoppedAt, statusEvents } =
    ticket;
  if (customer.email !== to || customer.emailBouncedAt || customer.emailComplainedAt || location.deletedAt) {
    return false;
  }
  if (type === "ticket_tracking_link") {
    return true;
  }
  if (notificationsStoppedAt) {
    return false;
  }
  if (type === "ticket_status_update") {
    return statusEvents[0].createdAt <= createdAt;
  }
  if (type === "ticket_ready_reminder") {
    return currentStatus.code === "READY" && !customerCollectedAt;
  }
  if (type === "ticket_ready_date_changed") {
    return showsEstimatedReadyDate(currentStatus.code) && emailLogs[0].createdAt <= createdAt;
  }
  return true;
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

  // A long outage can outlast the 5 minutes, and a second sweep would retry the
  // same rows, where a late failure overwrites a send that just worked.
  @Cron("*/5 * * * *", { waitForCompletion: true })
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
