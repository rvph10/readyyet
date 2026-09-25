import { Injectable, Logger } from "@nestjs/common";
import { BillingInterval } from "@readyyet/db";
import type Stripe from "stripe";
import { PrismaService } from "../database/prisma.service";
import { BillingService } from "./billing.service";
import {
  chargedExcludingTax,
  COMMISSION_RATE,
  COMMISSION_HOLD_MS,
  commissionWindowEnd,
  periodStart,
  shareWithin,
} from "./commission";
import { fromLookupKey, lookupKey } from "./plans";
import { getStripeClient } from "./stripe-client";

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
    if (business.referredByBusinessId && !business.sponsorCreditedAt) {
      await this.creditSponsor(business.id, business.referredByBusinessId, invoice);
    }
  }

  // A refund or dispute within 14 days of the invoice being paid voids its
  // commission (ADR 0040). Judged by when it happened, not when its webhook
  // arrives: Stripe retries a webhook for days, and the 14 days may be over
  // by then. Charges and disputes name their payment, which leads to the
  // invoice.
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
    const commission =
      payment && (await this.prisma.commission.findUnique({ where: { stripeInvoiceId: payment.invoice as string } }));
    if (
      !commission ||
      commission.voidedAt ||
      reversedAt.getTime() - commission.invoicePaidAt.getTime() >= COMMISSION_HOLD_MS
    ) {
      return;
    }
    if (commission.paidAt) {
      // Owed and paid out before the late webhook came, only the platform
      // admin can get it back.
      this.logger.error(`Commission ${commission.id} was paid out, but its invoice was refunded or disputed in time`);
      return;
    }
    await this.prisma.commission.updateMany({
      where: { id: commission.id, voidedAt: null, paidAt: null },
      data: { voidedAt: reversedAt },
    });
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
  // price, on the sponsor Business's balance. Its next invoices use it, a
  // sponsor still on trial keeps it for their first one.
  private async creditSponsor(businessId: string, sponsorId: string, invoice: Stripe.Invoice) {
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(
      invoice.parent!.subscription_details!.subscription as string,
    );
    const { plan } = fromLookupKey(subscription.items.data[0].price.lookup_key);
    const {
      data: [monthly],
    } = await stripe.prices.list({ lookup_keys: [lookupKey(plan, BillingInterval.MONTH)], active: true });

    const sponsor = await this.prisma.business.findUniqueOrThrow({
      where: { id: sponsorId },
      include: { owner: true },
    });
    const customer = sponsor.stripeCustomerId ?? (await this.billing.createCustomer(sponsor));
    // The key makes a webhook retried after Stripe accepted the credit, but
    // before sponsorCreditedAt was written, credit once.
    await stripe.customers.createBalanceTransaction(
      customer,
      { amount: -monthly.unit_amount!, currency: monthly.currency, description: "Referral reward" },
      { idempotencyKey: `sponsor-credit-${businessId}` },
    );
    await this.prisma.business.update({ where: { id: businessId }, data: { sponsorCreditedAt: new Date() } });
  }
}
