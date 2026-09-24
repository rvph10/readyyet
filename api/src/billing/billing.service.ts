import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { BillingDto } from "./dto/billing.response.dto";
import { isFrozen, memberLimit } from "./plans";

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async get(locationId: string): Promise<BillingDto> {
    const subscription = await this.prisma.subscription.findUniqueOrThrow({ where: { locationId } });
    return {
      status: subscription.status,
      plan: subscription.plan,
      interval: subscription.interval,
      trialEndsAt: subscription.trialEndsAt,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      scheduledPlan: subscription.scheduledPlan,
      scheduledInterval: subscription.scheduledInterval,
      frozen: isFrozen(subscription),
      memberLimit: memberLimit(subscription),
    };
  }
}
