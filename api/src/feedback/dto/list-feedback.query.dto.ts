import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";
import { MAX_PAGE } from "../../common/pagination";

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

  // 1 for the first, past the last it's an empty page.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE)
  page?: number;
}
