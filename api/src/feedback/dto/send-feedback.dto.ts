import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { FEEDBACK_MAX_LENGTH } from "../../common/text-limits";

export class SendFeedbackDto {
  // Free text only, no rating (ADR 0027).
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(FEEDBACK_MAX_LENGTH)
  message!: string;
}
