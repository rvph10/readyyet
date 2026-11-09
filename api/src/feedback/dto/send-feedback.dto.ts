import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { FEEDBACK_MAX_LENGTH, FEEDBACK_TAGS, type FeedbackTag } from "@readyyet/shared";

// What the Customer gives on the review page (ADR 0125). Stars are always
// there, as the page only offers its choices once a star is picked.
export class RateDto {
  @IsInt()
  @Min(1)
  @Max(5)
  stars!: number;

  @ApiProperty({ enum: FEEDBACK_TAGS, isArray: true })
  @IsArray()
  @ArrayUnique()
  @IsIn(FEEDBACK_TAGS, { each: true })
  tags!: FeedbackTag[];
}

export class SendFeedbackDto extends RateDto {
  // Private to the shop. Sending one closes the answer.
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() || undefined : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(FEEDBACK_MAX_LENGTH)
  message?: string;
}
