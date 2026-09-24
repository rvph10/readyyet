import { Injectable } from "@nestjs/common";
import { InvitationStatus, Plan, SubscriptionStatus } from "@readyyet/db";
import type Stripe from "stripe";
import { ConflictError, LocationFrozenError, MemberLimitError } from "../common/errors/app-error";
import { PrismaService } from "../database/prisma.service";
import { ChoosePlanDto } from "./dto/choose-plan.dto";
import { BillingDto } from "./dto/billing.response.dto";
import { RedirectDto } from "./dto/redirect.response.dto";
import { ESSENTIEL_MEMBER_LIMIT, isFrozen, lookupKey, memberLimit } from "./plans";
import { getStripeClient } from "./stripe-client";
import { toSubscriptionRow } from "./stripe-sync";

function perMonth(price: Stripe.Price) {
  return price.unit_amount! / (price.recurring!.interval === "year" ? 12 : 1);
}

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
    if (dto.plan === Plan.ESSENTIEL && (await this.countMembers(locationId)) > ESSENTIEL_MEMBER_LIMIT) {
      throw new MemberLimitError(ESSENTIEL_MEMBER_LIMIT);
    }

    const customer = location.business.stripeCustomerId ?? (await this.createCustomer(location.business));
    const price = await this.price(lookupKey(dto.plan, dto.interval));

    // Choosing during the trial keeps the days left, the card is charged
    // when the trial would have ended (ADR 0033).
    const trialEnd = subscription.status === SubscriptionStatus.TRIAL ? subscription.trialEndsAt! : null;
    const keepsTrial = trialEnd && trialEnd.getTime() - Date.now() > MIN_CHECKOUT_TRIAL_MS;

    const billingPage = `${process.env.WEB_URL}/locations/${locationId}/billing`;
    const session = await getStripeClient().checkout.sessions.create({
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

  // A Location that already pays moves to another plan or interval (ADR
  // 0033), or keeps its own, which undoes a waiting move or cancellation.
  async changePlan(locationId: string, dto: ChoosePlanDto): Promise<BillingDto> {
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(await this.paidSubscriptionId(locationId), {
      expand: ["schedule"],
    });
    const item = subscription.items.data[0];
    const key = lookupKey(dto.plan, dto.interval);
    const same = key === item.price.lookup_key;
    if (same && !subscription.schedule && !subscription.cancel_at_period_end) {
      throw new ConflictError("This location is already on this plan");
    }
    if (dto.plan === Plan.ESSENTIEL && (await this.countMembers(locationId)) > ESSENTIEL_MEMBER_LIMIT) {
      throw new MemberLimitError(ESSENTIEL_MEMBER_LIMIT);
    }

    await this.dropWhatWasWaiting(subscription);
    if (!same) {
      const price = await this.price(key);
      if (perMonth(price) > perMonth(item.price)) {
        // The change only applies once its prorated invoice is paid.
        const updated = await stripe.subscriptions.update(subscription.id, {
          items: [{ id: item.id, price: price.id }],
          proration_behavior: "always_invoice",
          payment_behavior: "pending_if_incomplete",
        });
        if (updated.pending_update) {
          throw new ConflictError("The payment for this change failed, update the card and try again");
        }
      } else {
        await this.scheduleAtPeriodEnd(subscription, item, price);
      }
    }

    await this.sync(subscription.id);
    return this.get(locationId);
  }

  // Stops at the end of the paid period, the Location freezes then.
  async cancel(locationId: string): Promise<BillingDto> {
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(await this.paidSubscriptionId(locationId), {
      expand: ["schedule"],
    });
    if (subscription.cancel_at_period_end) {
      throw new ConflictError("This location's subscription is already cancelled");
    }
    await this.dropWhatWasWaiting(subscription);
    await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true });

    await this.sync(subscription.id);
    return this.get(locationId);
  }

  // Stripe's own page for the Business's cards, invoices and billing
  // details. Plan changes are off there, they go through changePlan.
  async portal(business: { id: string; stripeCustomerId: string | null }): Promise<RedirectDto> {
    if (!business.stripeCustomerId) {
      throw new ConflictError("This business hasn't paid for a location yet");
    }
    const session = await getStripeClient().billingPortal.sessions.create({
      customer: business.stripeCustomerId,
      return_url: `${process.env.WEB_URL}/businesses/${business.id}/billing`,
    });
    return { url: session.url };
  }

  // Invoices and Stripe's payment emails go to the Customer's email, which
  // has to follow the Business to its new Owner.
  async ownerChanged(businessId: string) {
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      include: { owner: true },
    });
    if (business.stripeCustomerId) {
      await getStripeClient().customers.update(business.stripeCustomerId, { email: business.owner.email });
    }
  }

  // Deleting a Location ends its subscription at once, without refund
  // (ADR 0033).
  async cancelNow(locationId: string) {
    const { status, stripeSubscriptionId } = await this.prisma.subscription.findUniqueOrThrow({
      where: { locationId },
    });
    if (status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.PAST_DUE) {
      await getStripeClient().subscriptions.cancel(stripeSubscriptionId!);
    }
  }

  // What a frozen Location can't do: create Tickets (ADR 0031).
  async assertNotFrozen(locationId: string) {
    const subscription = await this.prisma.subscription.findUniqueOrThrow({ where: { locationId } });
    if (isFrozen(subscription)) {
      throw new LocationFrozenError();
    }
  }

  // Before an invitation that would add a member.
  async assertRoomForMember(locationId: string) {
    const subscription = await this.prisma.subscription.findUniqueOrThrow({ where: { locationId } });
    if (isFrozen(subscription)) {
      throw new LocationFrozenError();
    }
    const limit = memberLimit(subscription);
    if (limit && (await this.countMembers(locationId)) >= limit) {
      throw new MemberLimitError(limit);
    }
  }

  // Memberships and pending invitations both count (ADR 0031).
  private async countMembers(locationId: string) {
    const [members, invitations] = await Promise.all([
      this.prisma.membership.count({ where: { locationId } }),
      this.prisma.invitation.count({
        where: { locationId, status: InvitationStatus.PENDING, expiresAt: { gt: new Date() } },
      }),
    ]);
    return members + invitations;
  }

  // Every webhook ends here (ADR 0033): Stripe's current state is written
  // whatever the event said, so a late or repeated event is harmless.
  async sync(stripeSubscriptionId: string) {
    const subscription = await getStripeClient().subscriptions.retrieve(stripeSubscriptionId, { expand: ["schedule"] });
    const locationId = subscription.metadata.locationId;
    const row = toSubscriptionRow(subscription);
    if (!locationId || !row) {
      return;
    }
    // A Location that paid again has a new subscription, the end of its
    // previous one must not freeze it.
    await this.prisma.subscription.updateMany({
      where: {
        locationId,
        ...(row.status === SubscriptionStatus.ENDED && {
          OR: [{ stripeSubscriptionId: null }, { stripeSubscriptionId: subscription.id }],
        }),
      },
      data: row,
    });
  }

  private async paidSubscriptionId(locationId: string) {
    const { status, stripeSubscriptionId } = await this.prisma.subscription.findUniqueOrThrow({
      where: { locationId },
    });
    if (status !== SubscriptionStatus.ACTIVE && status !== SubscriptionStatus.PAST_DUE) {
      throw new ConflictError("This location has no subscription, choose a plan through checkout");
    }
    return stripeSubscriptionId!;
  }

  private async price(key: string) {
    const {
      data: [price],
    } = await getStripeClient().prices.list({ lookup_keys: [key], active: true });
    return price;
  }

  // A new choice replaces whatever was waiting for the period end, and a
  // subscription under a schedule can't be changed directly.
  private async dropWhatWasWaiting(subscription: Stripe.Subscription) {
    const stripe = getStripeClient();
    if (subscription.schedule) {
      await stripe.subscriptionSchedules.release((subscription.schedule as Stripe.SubscriptionSchedule).id);
    }
    if (subscription.cancel_at_period_end) {
      await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: false });
    }
  }

  // The current price until the period ends, then the new one. The phase's
  // metadata is how the webhook knows what's coming (stripe-sync.ts).
  private async scheduleAtPeriodEnd(
    subscription: Stripe.Subscription,
    item: Stripe.SubscriptionItem,
    price: Stripe.Price,
  ) {
    const stripe = getStripeClient();
    const schedule = await stripe.subscriptionSchedules.create({ from_subscription: subscription.id });
    // Stripe built this phase from the subscription, its trial included.
    // Rewritten without the trial, the phase would end it on the spot and
    // bill the rest of the trial days (ADR 0033).
    const [current] = schedule.phases;
    await stripe.subscriptionSchedules.update(schedule.id, {
      end_behavior: "release",
      phases: [
        {
          items: [{ price: item.price.id }],
          start_date: current.start_date,
          end_date: current.end_date,
          ...(current.trial_end && { trial_end: current.trial_end }),
        },
        {
          items: [{ price: price.id }],
          duration: { interval: price.recurring!.interval, interval_count: 1 },
          proration_behavior: "none",
          metadata: { lookupKey: price.lookup_key! },
        },
      ],
    });
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
