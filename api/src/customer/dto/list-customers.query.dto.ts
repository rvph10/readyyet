import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { NAME_MAX_LENGTH } from "@readyyet/shared";
import { MAX_PAGE } from "../../common/pagination";

export class ListCustomersQueryDto {
  // A to Z without it.
  @IsOptional()
  @IsIn(["name", "email", "phone", "since"])
  sort?: "name" | "email" | "phone" | "since";

  @IsOptional()
  @IsIn(["asc", "desc"])
  dir?: "asc" | "desc";

  @IsOptional()
  @IsString()
  @MaxLength(NAME_MAX_LENGTH)
  q?: string;

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
