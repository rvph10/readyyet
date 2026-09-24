import { Injectable } from "@nestjs/common";
import { InvitationStatus, Plan, SubscriptionStatus } from "@readyyet/db";
import { ConflictError } from "../common/errors/app-error";
import { PrismaService } from "../database/prisma.service";
import { ChoosePlanDto } from "./dto/choose-plan.dto";
import { BillingDto } from "./dto/billing.response.dto";
import { RedirectDto } from "./dto/redirect.response.dto";
import { isFrozen, lookupKey, memberLimit } from "./plans";
import { getStripeClient } from "./stripe-client";

// Stripe refuses a Checkout trial ending less than 48 hours away.
const MIN_CHECKOUT_TRIAL_MS = 48 * 60 * 60 * 1000;

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

  // A Location's first payment, or its first since its subscription ended.
  async checkout(locationId: string, dto: ChoosePlanDto): Promise<RedirectDto> {
    const location = await this.prisma.location.findUniqueOrThrow({
      where: { id: locationId },
      include: { subscription: true, business: { include: { owner: true } } },
    });
    const subscription = location.subscription!;
    if (subscription.status === SubscriptionStatus.ACTIVE || subscription.status === SubscriptionStatus.PAST_DUE) {
      throw new ConflictError("This location already has a subscription, change its plan instead");
    }
    if (dto.plan === Plan.ESSENTIEL) {
      await this.assertWithinEssentielLimit(locationId);
    }

    const stripe = getStripeClient();
    const customer = location.business.stripeCustomerId ?? (await this.createCustomer(location.business));
    const {
      data: [price],
    } = await stripe.prices.list({ lookup_keys: [lookupKey(dto.plan, dto.interval)], active: true });

    // Choosing during the trial keeps the days left, the card is charged
    // when the trial would have ended (ADR 0033).
    const trialEnd = subscription.status === SubscriptionStatus.TRIAL ? subscription.trialEndsAt! : null;
    const keepsTrial = trialEnd && trialEnd.getTime() - Date.now() > MIN_CHECKOUT_TRIAL_MS;

    const billingPage = `${process.env.WEB_URL}/locations/${locationId}/billing`;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      line_items: [{ price: price.id, quantity: 1 }],
      subscription_data: {
        description: location.name,
        metadata: { locationId },
        ...(keepsTrial && { trial_end: Math.floor(trialEnd.getTime() / 1000) }),
      },
      // The shop's VAT number and address, for its own accounting.
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      customer_update: { name: "auto", address: "auto" },
      success_url: `${billingPage}?checkout=success`,
      cancel_url: billingPage,
    });
    return { url: session.url! };
  }

  // Memberships and pending invitations both count (ADR 0031).
  async assertWithinEssentielLimit(locationId: string) {
    const [members, invitations] = await Promise.all([
      this.prisma.membership.count({ where: { locationId } }),
      this.prisma.invitation.count({
        where: { locationId, status: InvitationStatus.PENDING, expiresAt: { gt: new Date() } },
      }),
    ]);
    if (members + invitations > 2) {
      throw new ConflictError("Essentiel allows 2 members, remove members or revoke invitations first");
    }
  }

  private async createCustomer(business: { id: string; name: string; owner: { email: string } }) {
    // The idempotency key makes two checkouts started at once get the same
    // Customer from Stripe, instead of one each.
    const customer = await getStripeClient().customers.create(
      { name: business.name, email: business.owner.email, metadata: { businessId: business.id } },
      { idempotencyKey: `customer-${business.id}` },
    );
    await this.prisma.business.update({ where: { id: business.id }, data: { stripeCustomerId: customer.id } });
    return customer.id;
  }
}
