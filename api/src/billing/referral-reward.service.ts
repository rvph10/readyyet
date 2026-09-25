import { Injectable } from "@nestjs/common";
import { BillingInterval } from "@readyyet/db";
import type Stripe from "stripe";
import { PrismaService } from "../database/prisma.service";
import { BillingService } from "./billing.service";
import { fromLookupKey, lookupKey } from "./plans";
import { getStripeClient } from "./stripe-client";

// What a referral earns, once the referred Business pays (ADR 0032, ADR 0040).
@Injectable()
export class ReferralRewardService {
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
    await this.prisma.business.updateMany({
      where: { id: business.id, firstInvoicePaidAt: null },
      data: { firstInvoicePaidAt: new Date(invoice.status_transitions.paid_at! * 1000) },
    });
    if (business.referredByBusinessId && !business.sponsorCreditedAt) {
      await this.creditSponsor(business.id, business.referredByBusinessId, invoice);
    }
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
