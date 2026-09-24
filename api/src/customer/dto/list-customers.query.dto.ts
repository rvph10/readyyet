import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { NAME_MAX_LENGTH } from "../../common/text-limits";

export class ListCustomersQueryDto {
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

  // Opaque, the nextCursor of the previous page.
  @IsOptional()
  @IsString()
  cursor?: string;
}
