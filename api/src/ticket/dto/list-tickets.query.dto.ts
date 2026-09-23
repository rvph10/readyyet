import { Transform, Type } from "class-transformer";
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";

export class ListTicketsQueryDto {
  // One search box: matched against title, description, tracking code and
  // the customer's name, email and phone.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  q?: string;

  // Status codes, as repeated params (?status=A&status=B) or comma-separated.
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    [value].flat().flatMap((item) => (typeof item === "string" ? item.split(",").filter(Boolean) : [item])),
  )
  @IsString({ each: true })
  status?: string[];

  @IsOptional()
  @IsIn(["open", "ended"])
  state?: "open" | "ended";

  @IsOptional()
  @IsISO8601()
  createdFrom?: string;

  @IsOptional()
  @IsISO8601()
  createdTo?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @Matches(/^\d+$/)
  customerId?: string;

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
