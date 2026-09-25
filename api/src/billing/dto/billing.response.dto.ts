import { ApiProperty } from "@nestjs/swagger";
import { BillingInterval, Plan, SubscriptionStatus } from "@readyyet/db";

export class BillingDto {
  // TRIAL until a plan is chosen, then Stripe's state: ACTIVE, PAST_DUE
  // while failed payments are retried, ENDED once the subscription is over.
  @ApiProperty({ enum: SubscriptionStatus })
  status!: SubscriptionStatus;
  // PRO during the trial, null for a Location that never had one nor paid.
  @ApiProperty({ enum: Plan, nullable: true })
  plan!: Plan | null;
  @ApiProperty({ enum: BillingInterval, nullable: true })
  interval!: BillingInterval | null;
  trialEndsAt!: Date | null;
  currentPeriodEnd!: Date | null;
  // Cancelled by the Owner, it stops at currentPeriodEnd.
  cancelAtPeriodEnd!: boolean;
  // A move to a cheaper price taking effect at currentPeriodEnd.
  @ApiProperty({ enum: Plan, nullable: true })
  scheduledPlan!: Plan | null;
  @ApiProperty({ enum: BillingInterval, nullable: true })
  scheduledInterval!: BillingInterval | null;
  // No new Tickets and no invitations, everything else keeps working (ADR 0031).
  frozen!: boolean;
  // Memberships plus pending invitations, null when unlimited.
  memberLimit!: number | null;
  // The next checkout takes half a month off, the Business was referred
  // (ADR 0032).
  referralDiscount!: boolean;
}

export class PromotionCodePreviewDto {
  // In cents, what the card will be charged, balance credit taken off.
  nextInvoiceAmount!: number;
  nextInvoiceAmountWithCode!: number;
}
