import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ListFeedbackQueryDto {
  // "false" lists only what's still to be dealt with, "true" only what's
  // been handled.
  @IsOptional()
  @IsIn(["true", "false"])
  handled?: "true" | "false";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;

  // Opaque, the nextCursor of the previous page.
  @IsOptional()
  @IsString()
  cursor?: string;
}
