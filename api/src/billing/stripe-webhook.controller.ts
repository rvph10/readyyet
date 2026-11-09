import { Controller, Post, Req, Res } from "@nestjs/common";
import { ApiExcludeEndpoint, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import type { Request, Response } from "express";
import Stripe from "stripe";
import { BillingService } from "./billing.service";
import { ReferralRewardService } from "./referral-reward.service";

@ApiTags("Billing")
@AllowAnonymous()
// Stripe sends events in bursts (a checkout alone is several), throttling
// would drop signed, legitimate calls.
@SkipThrottle()
@Controller("webhooks/stripe")
export class StripeWebhookController {
  constructor(
    private readonly billing: BillingService,
    private readonly referralRewards: ReferralRewardService,
  ) {}

  @Post()
  // Called by Stripe, not a client of this API.
  @ApiExcludeEndpoint()
  async handle(@Req() req: Request, @Res() res: Response) {
    let event: Stripe.Event;
    try {
      // req.body is the raw Buffer, see the express.raw() mount in
      // common/http-middleware.ts.
      event = Stripe.webhooks.constructEvent(
        req.body as Buffer,
        req.headers["stripe-signature"] as string,
        process.env.STRIPE_WEBHOOK_SECRET as string,
      );
    } catch {
      res.status(400).send();
      return;
    }

    if (event.type === "checkout.session.completed") {
      await this.billing.checkoutCompleted(event.data.object);
    }
    if (event.type === "invoice.paid") {
      await this.referralRewards.invoicePaid(event.data.object);
    }
    if (event.type === "charge.refunded" || event.type === "charge.dispute.created") {
      await this.referralRewards.paymentReversed(
        event.data.object.payment_intent as string | null,
        new Date(event.created * 1000),
      );
    }
    const subscriptionId = subscriptionOf(event);
    if (subscriptionId) {
      await this.billing.sync(subscriptionId);
    }
    res.status(200).send();
  }
}

function subscriptionOf(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      return event.data.object.subscription as string | null;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      return event.data.object.id;
    case "subscription_schedule.updated":
    case "subscription_schedule.released":
    case "subscription_schedule.canceled":
      return event.data.object.subscription as string | null;
    default:
      return null;
  }
}
