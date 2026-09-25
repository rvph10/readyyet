import { Locale } from "@readyyet/db";
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, MaxLength } from "class-validator";
import { OptionalNotNull } from "../../common/decorators/optional-not-null.decorator";
import { NAME_MAX_LENGTH } from "../../common/text-limits";

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
