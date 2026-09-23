import { Locale } from "@readyyet/db";
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsPhoneNumber, IsString } from "class-validator";

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
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
