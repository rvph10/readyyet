import { ApiProperty } from "@nestjs/swagger";
import { FEEDBACK_TAGS, type FeedbackTag } from "@readyyet/shared";

export class FeedbackTicketDto {
  id!: string;
  title!: string;
}

export class FeedbackCustomerDto {
  id!: string;
  fullName!: string;
  // To answer them, null when they gave none.
  email!: string | null;
  phone!: string | null;
  // Has an address that hasn't bounced or complained, so a reply can go.
  emailable!: boolean;
}

export class FeedbackHandlerDto {
  id!: string;
  name!: string;
}

export class FeedbackDto {
  id!: string;
  // Null on feedback sent before ratings existed (ADR 0125).
  @ApiProperty({ type: Number, nullable: true })
  stars!: number | null;
  @ApiProperty({ enum: FEEDBACK_TAGS, isArray: true })
  tags!: FeedbackTag[];
  // Private to the shop, null when the Customer only rated.
  @ApiProperty({ type: String, nullable: true })
  message!: string | null;
  // When they left for Google from the review page.
  googleClickedAt!: Date | null;
  // What the shop emailed back, and when.
  @ApiProperty({ type: String, nullable: true })
  reply!: string | null;
  repliedAt!: Date | null;
  // Unhandled, with a message or a rating of 1 or 2.
  needsFollowUp!: boolean;
  ticket!: FeedbackTicketDto;
  customer!: FeedbackCustomerDto;
  // Who marked it dealt with, and when, null until then.
  handledAt!: Date | null;
  handledBy!: FeedbackHandlerDto | null;
  createdAt!: Date;
}

export class FeedbackPageDto {
  items!: FeedbackDto[];
  // Across every page, for what the filters match.
  total!: number;
}

export class FeedbackTagCountDto {
  @ApiProperty({ enum: FEEDBACK_TAGS })
  tag!: FeedbackTag;
  count!: number;
}

export class FeedbackAllTimeDto {
  ratings!: number;
  @ApiProperty({ type: Number, nullable: true })
  average!: number | null;
}

// This month on the Location's clock (ADR 0125).
export class FeedbackInsightsDto {
  // "2026-11".
  month!: string;
  // Customers sent the feedback email.
  asked!: number;
  answers!: number;
  ratings!: number;
  @ApiProperty({ type: Number, nullable: true })
  average!: number | null;
  // How many gave 1 star, then 2, up to 5.
  @ApiProperty({ type: Number, isArray: true })
  stars!: number[];
  // Most chosen first, only tags chosen at least once.
  tags!: FeedbackTagCountDto[];
  // Taps on "Review on Google".
  google!: number;
  messages!: number;
  allTime!: FeedbackAllTimeDto;
}
