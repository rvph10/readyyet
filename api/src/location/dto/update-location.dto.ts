import { Locale } from "@readyyet/db";
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, IsUrl, MaxLength } from "class-validator";
import { NAME_MAX_LENGTH } from "../../common/text-limits";

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  name?: string;

  @IsOptional()
  @IsPhoneNumber()
  contactPhone?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  // Shown as an image in customer emails and on the tracking page, so only
  // an https address, never a javascript: or data: one.
  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(2048)
  logoUrl?: string;

  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;
}
