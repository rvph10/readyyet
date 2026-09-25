import { Locale } from "@readyyet/db";
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, MaxLength } from "class-validator";
import { NAME_MAX_LENGTH } from "../../common/text-limits";
import { OptionalNotNull } from "../../common/decorators/optional-not-null.decorator";

export class UpdateCustomerDto {
  @OptionalNotNull()
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  // null clears it, falling back to the Location's locale (ADR 0015).
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale | null;
}
