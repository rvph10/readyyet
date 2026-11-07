import { ApiProperty } from "@nestjs/swagger";
import { IsGoogleReviewUrl } from "../location-info";
import type { ReviewLinkResult } from "../review-link-check";

export class CheckReviewLinkDto {
  @IsGoogleReviewUrl()
  url!: string;
}

export class ReviewLinkCheckDto {
  @ApiProperty({ enum: ["works", "dead", "unknown"] })
  result!: ReviewLinkResult;
}
