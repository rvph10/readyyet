import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { REPLY_MAX_LENGTH } from "@readyyet/shared";

export class ReplyFeedbackDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(REPLY_MAX_LENGTH)
  reply!: string;
}
