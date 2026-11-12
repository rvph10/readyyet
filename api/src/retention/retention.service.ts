import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Prisma } from "@readyyet/db";
import { ENDED_STATUS_CODES } from "@readyyet/shared";
import { CronMonitor } from "../common/decorators/cron-monitor.decorator";
import { customerErasure, photoKeysOfCustomers } from "../customer/customer-erasure";
import { PrismaService } from "../database/prisma.service";
import { StorageService } from "../storage/storage.service";

const DAY_MS = 24 * 60 * 60 * 1000;
const EMAIL_CONTENT_DAYS = 30;
const CUSTOMER_MONTHS = 24;
const INVITATION_DAYS = 30;
const EMAIL_RECORD_MONTHS = 24;
const BATCH_SIZE = 500;

// The retention periods of ADR 0128 that no request triggers.
@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Cron("0 30 3 * * *", { name: "retention" })
  @CronMonitor("retention", {
    schedule: { type: "crontab", value: "30 3 * * *" },
    checkinMargin: 15,
    maxRuntime: 30,
  })
  // One step failing doesn't hold the others back. The run still fails, for
  // the monitor and Sentry.
  async run() {
    const failures: unknown[] = [];
    for (const step of [
      () => this.clearOldEmailContent(),
      () => this.deleteExpiredSignIns(),
      () => this.eraseInactiveCustomers(),
      () => this.deleteOldInvitations(),
      () => this.deleteOldEmailRecords(),
    ]) {
      try {
        await step();
      } catch (error) {
        this.logger.error("A retention step failed", error);
        failures.push(error);
      }
    }
    if (failures.length > 0) {
      throw new AggregateError(failures, "Retention steps failed");
    }
  }

  // Long past any retry, the sweep gives up after a day (ADR 0081). That
  // it was sent and whether it arrived stays, what it said goes.
  async clearOldEmailContent() {
    await this.prisma.emailLog.updateMany({
      where: {
        createdAt: { lt: new Date(Date.now() - EMAIL_CONTENT_DAYS * DAY_MS) },
        OR: [{ html: { not: null } }, { text: { not: null } }, { attachments: { not: Prisma.DbNull } }],
      },
      data: { html: null, text: null, attachments: Prisma.DbNull },
    });
  }

  // Better Auth only deletes an expired session or code when it's used again.
  async deleteExpiredSignIns() {
    const now = new Date();
    await this.prisma.session.deleteMany({ where: { expiresAt: { lt: now } } });
    await this.prisma.verification.deleteMany({ where: { expiresAt: { lt: now } } });
  }

  // Accepted or not, an invitation has done its job a month after it expired.
  async deleteOldInvitations() {
    await this.prisma.invitation.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - INVITATION_DAYS * DAY_MS) } },
    });
  }

  // Who an email went to and whether it arrived, kept for support and
  // disputes, then gone (privacy notice).
  async deleteOldEmailRecords() {
    const cutoff = new Date();
    cutoff.setUTCMonth(cutoff.getUTCMonth() - EMAIL_RECORD_MONTHS);
    await this.prisma.emailLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  }

  // A Customer with nothing open and nothing moving for 24 months, or left
  // at a Location deleted before ADR 0128 erased them with it.
  async eraseInactiveCustomers() {
    const cutoff = new Date();
    cutoff.setUTCMonth(cutoff.getUTCMonth() - CUSTOMER_MONTHS);
    for (;;) {
      const customers = await this.prisma.customer.findMany({
        where: {
          deletedAt: null,
          OR: [
            {
              createdAt: { lt: cutoff },
              tickets: {
                none: {
                  OR: [
                    { currentStatus: { code: { notIn: [...ENDED_STATUS_CODES] } } },
                    { statusEvents: { some: { createdAt: { gte: cutoff } } } },
                  ],
                },
              },
            },
            { location: { deletedAt: { not: null } } },
          ],
        },
        select: { id: true },
        take: BATCH_SIZE,
      });
      if (customers.length === 0) {
        return;
      }
      const ids = customers.map((customer) => customer.id);
      const photoKeys = await photoKeysOfCustomers(this.prisma, ids);
      await this.prisma.$transaction(customerErasure(this.prisma, { id: { in: ids } }));
      await this.storage.delete(photoKeys);
    }
  }
}
