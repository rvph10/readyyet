import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SubscriptionStatus } from "@readyyet/db";
import { CronMonitor } from "../common/decorators/cron-monitor.decorator";
import { PrismaService } from "../database/prisma.service";
import { EmailService } from "../email/email.service";
import { buildTrialEndingEmail } from "../notification/staff-email/staff-email";

const DAY_MS = 24 * 60 * 60 * 1000;
const REMIND_BEFORE_MS = 3 * DAY_MS;

// One email to the Owner, three days before a trial ends (ADR 0033).
@Injectable()
export class TrialReminderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, { name: "trial-reminders" })
  @CronMonitor("trial-reminders", {
    schedule: { type: "crontab", value: "0 * * * *" },
    checkinMargin: 5,
    maxRuntime: 10,
  })
  async sweep() {
    const now = new Date();
    const due = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.TRIAL,
        trialReminderSentAt: null,
        trialEndsAt: { gt: now, lte: new Date(now.getTime() + REMIND_BEFORE_MS) },
        location: { deletedAt: null },
      },
      include: { location: { include: { business: { include: { owner: true } } } } },
    });

    for (const { locationId, trialEndsAt, location } of due) {
      // Claimed before sending, so an overlapping sweep can't send it twice.
      // A failed send is retried by EmailRetryService, not here.
      const { count } = await this.prisma.subscription.updateMany({
        where: { locationId, trialReminderSentAt: null },
        data: { trialReminderSentAt: now },
      });
      if (count === 0) {
        continue;
      }

      const owner = location.business.owner;
      const email = buildTrialEndingEmail({
        locale: owner.locale,
        location: location.name,
        days: Math.ceil((trialEndsAt!.getTime() - now.getTime()) / DAY_MS),
        billingUrl: `${process.env.WEB_URL}/locations/${locationId}/billing`,
      });
      await this.email.send({ to: owner.email, ...email, type: "trial_ending" });
    }
  }
}
