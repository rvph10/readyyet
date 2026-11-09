import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";
import { MAX_PAGE } from "../../common/pagination";

export class ListFeedbackQueryDto {
  // "follow-up" lists only what still needs someone (ADR 0125), "all" every
  // answer, the default.
  @IsOptional()
  @IsIn(["follow-up", "all"])
  view?: "follow-up" | "all";

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
