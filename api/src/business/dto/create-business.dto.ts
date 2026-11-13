import { Transform, Type } from "class-transformer";
import { Locale } from "@readyyet/db";
import {
  ArrayMaxSize,
  IsArray,
  IsDefined,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { NAME_MAX_LENGTH } from "@readyyet/shared";
import { AcceptTermsDto } from "./accept-terms.dto";
import { OpeningHoursSpecificationDto, PostalAddressDto } from "../../location/dto/location-info.dto";
import { canonicalTimeZone, IsRegionTimeZone, IsWeeklyOpeningHours } from "../../location/location-info";

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  name!: string;

  @IsString()
  @IsNotEmpty()
  businessTypeCode!: string;

  // Only with OTHER (ADR 0071).
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  businessTypeDetail?: string;

  @IsPhoneNumber()
  contactPhone!: string;

  @IsEmail()
  contactEmail!: string;

  @IsEnum(Locale)
  locale!: Locale;

  // Suggested by the web app from the country, with Intl.Locale's
  // timeZones ("und-BE" gives Europe/Brussels).
  @Transform(({ value }: { value: unknown }) => canonicalTimeZone(value) ?? value)
  @IsRegionTimeZone()
  timeZone!: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PostalAddressDto)
  address?: PostalAddressDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(14)
  @ValidateNested({ each: true })
  @Type(() => OpeningHoursSpecificationDto)
  @IsWeeklyOpeningHours()
  openingHours?: OpeningHoursSpecificationDto[];
}

// A Business's next Location, which can start from another one's custom
// Workflow. Used once it's on Pro, like any custom Workflow (ADR 0031).
export class AddLocationDto extends CreateLocationDto {
  @IsOptional()
  @IsUUID()
  copyWorkflowFrom?: string;
}

export class CreateBusinessDto extends AcceptTermsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  name!: string;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateLocationDto)
  location!: CreateLocationDto;

  // From the referral link the web app remembered (ADR 0032).
  @IsOptional()
  @IsString()
  @MaxLength(64)
  referralCode?: string;
}
