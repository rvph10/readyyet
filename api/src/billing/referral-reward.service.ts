import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { BillingInterval } from "@readyyet/db";
import type Stripe from "stripe";
import { CronMonitor } from "../common/decorators/cron-monitor.decorator";
import { PrismaService } from "../database/prisma.service";
import { BillingService } from "./billing.service";
import {
  chargedExcludingTax,
  COMMISSION_RATE,
  REWARD_HOLD_MS,
  commissionWindowEnd,
  periodStart,
  shareWithin,
} from "./commission";
import { fromLookupKey, lookupKey } from "./plans";
import { getStripeClient } from "./stripe-client";

function reversedInTime(held: { invoicePaidAt: Date; voidedAt: Date | null }, reversedAt: Date) {
  return !held.voidedAt && reversedAt.getTime() - held.invoicePaidAt.getTime() < REWARD_HOLD_MS;
}

// What a referral earns, once the referred Business pays (ADR 0032, ADR 0040).
@Injectable()
export class ReferralRewardService {
  private readonly logger = new Logger(ReferralRewardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
  ) {}

  async invoicePaid(invoice: Stripe.Invoice) {
    // A trial's first invoice, or one a discount covered, isn't paying.
    if (invoice.amount_paid <= 0) {
      return;
    }
    const business = await this.prisma.business.findUnique({
      where: { stripeCustomerId: invoice.customer as string },
    });
    if (!business) {
      return;
    }
    // From the service it pays for, not the payment: a charge retried for
    // days would otherwise shift the 6 months off the billing periods.
    const paidFrom = business.paidFrom ?? new Date(periodStart(invoice) * 1000);
    await this.prisma.business.updateMany({
      where: { id: business.id, paidFrom: null },
      data: { paidFrom },
    });
    if (business.referredBySalesPartnerId) {
      await this.recordCommission(business.id, business.referredBySalesPartnerId, paidFrom, invoice);
    }
    if (business.referredByBusinessId) {
      await this.recordSponsorCredit(business.id, business.referredByBusinessId, invoice);
    }
  }

  // Held credits whose 14 days passed without a refund or dispute go on the
  // sponsor's balance (ADR 0040).
  @Cron(CronExpression.EVERY_HOUR, { name: "sponsor-credits" })
  @CronMonitor("sponsor-credits", {
    schedule: { type: "crontab", value: "0 * * * *" },
    checkinMargin: 5,
    maxRuntime: 10,
  })
  async creditDueSponsors() {
    const due = await this.prisma.sponsorCredit.findMany({
      where: { creditedAt: null, voidedAt: null, invoicePaidAt: { lte: new Date(Date.now() - REWARD_HOLD_MS) } },
      include: { sponsorBusiness: { include: { owner: true } } },
    });
    for (const credit of due) {
      // One failure mustn't hold up the others, the next sweep retries it.
      await this.creditSponsor(credit).catch((err) => {
        this.logger.error(
          `Failed to credit the sponsor of business ${credit.businessId}`,
          err instanceof Error ? err.stack : err,
        );
      });
    }
  }

  // A refund or dispute within 14 days of the invoice being paid voids its
  // commission and its sponsor credit (ADR 0040). Judged by when it
  // happened, not when its webhook arrives: Stripe retries a webhook for
  // days, and the 14 days may be over by then. Charges and disputes name
  // their payment, which leads to the invoice.
  async paymentReversed(paymentIntent: string | null, reversedAt: Date) {
    if (!paymentIntent) {
      return;
    }
    const {
      data: [payment],
    } = await getStripeClient().invoicePayments.list({
      payment: { type: "payment_intent", payment_intent: paymentIntent },
      limit: 1,
    });
    if (!payment) {
      return;
    }
    const stripeInvoiceId = payment.invoice as string;
    const [commission, sponsorCredit] = await Promise.all([
      this.prisma.commission.findUnique({ where: { stripeInvoiceId } }),
      this.prisma.sponsorCredit.findUnique({ where: { stripeInvoiceId } }),
    ]);

    if (commission && reversedInTime(commission, reversedAt)) {
      if (commission.paidAt) {
        // Paid out before the late webhook came, only the platform admin
        // can get it back.
        this.logger.error(`Commission ${commission.id} was paid out, but its invoice was refunded or disputed in time`);
      } else {
        await this.prisma.commission.updateMany({
          where: { id: commission.id, voidedAt: null, paidAt: null },
          data: { voidedAt: reversedAt },
        });
      }
    }
    if (sponsorCredit && reversedInTime(sponsorCredit, reversedAt)) {
      if (sponsorCredit.creditedAt) {
        this.logger.error(
          `The sponsor credit of business ${sponsorCredit.businessId} was given, but its invoice was refunded or disputed in time`,
        );
      } else {
        await this.prisma.sponsorCredit.updateMany({
          where: { businessId: sponsorCredit.businessId, voidedAt: null, creditedAt: null },
          data: { voidedAt: reversedAt },
        });
      }
    }
  }

  // Only while the User is still a sales partner, and only for the part of
  // the invoice inside the 6 months (ADR 0040).
  private async recordCommission(businessId: string, salesPartnerId: string, paidFrom: Date, invoice: Stripe.Invoice) {
    const { salesPartnerSince } = await this.prisma.user.findUniqueOrThrow({ where: { id: salesPartnerId } });
    const share = shareWithin(invoice, paidFrom, commissionWindowEnd(paidFrom));
    if (!salesPartnerSince || share === 0) {
      return;
    }
    await this.prisma.commission.createMany({
      data: {
        salesPartnerId,
        businessId,
        stripeInvoiceId: invoice.id,
        amount: Math.round(chargedExcludingTax(invoice) * share * COMMISSION_RATE),
        invoicePaidAt: new Date(invoice.status_transitions.paid_at! * 1000),
      },
      skipDuplicates: true,
    });
  }

  // One month of the plan the referred Business chose, at the monthly
  // price, from its first paid invoice only. A voided one isn't replaced.
  private async recordSponsorCredit(businessId: string, sponsorBusinessId: string, invoice: Stripe.Invoice) {
    if (await this.prisma.sponsorCredit.findUnique({ where: { businessId } })) {
      return;
    }
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(
      invoice.parent!.subscription_details!.subscription as string,
    );
    const { plan } = fromLookupKey(subscription.items.data[0].price.lookup_key);
    const {
      data: [monthly],
    } = await stripe.prices.list({ lookup_keys: [lookupKey(plan, BillingInterval.MONTH)], active: true });
    await this.prisma.sponsorCredit.createMany({
      data: {
        businessId,
        sponsorBusinessId,
        stripeInvoiceId: invoice.id,
        amount: monthly.unit_amount!,
        invoicePaidAt: new Date(invoice.status_transitions.paid_at! * 1000),
      },
      skipDuplicates: true,
    });
  }

  // On the sponsor Business's balance, used by its next invoices. A sponsor
  // who never paid gets a Customer to hold it until their first one.
  private async creditSponsor(credit: {
    businessId: string;
    amount: number;
    sponsorBusiness: { id: string; name: string; stripeCustomerId: string | null; owner: { email: string } };
  }) {
    const customer =
      credit.sponsorBusiness.stripeCustomerId ?? (await this.billing.createCustomer(credit.sponsorBusiness));
    // The key makes a sweep retried after Stripe accepted the credit, but
    // before creditedAt was written, credit once.
    await getStripeClient().customers.createBalanceTransaction(
      customer,
      // Prices are in euros (ADR 0031).
      { amount: -credit.amount, currency: "eur", description: "Referral reward" },
      { idempotencyKey: `sponsor-credit-${credit.businessId}` },
    );
    await this.prisma.sponsorCredit.update({
      where: { businessId: credit.businessId },
      data: { creditedAt: new Date() },
    });
  }
}
