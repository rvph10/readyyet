import { ApiPropertyOptional } from "@nestjs/swagger";
import { Locale } from "@readyyet/db";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { NAME_MAX_LENGTH } from "../../common/text-limits";
import { canonicalTimeZone, IsRegionTimeZone, IsWeeklyOpeningHours } from "../location-info";
import { OpeningHoursSpecificationDto, PostalAddressDto } from "./location-info.dto";

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

  // Not IsOptional, which also lets null through to a required column.
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }: { value: unknown }) => canonicalTimeZone(value) ?? value)
  @IsRegionTimeZone()
  timeZone?: string;

  // null removes it.
  @ApiPropertyOptional({ type: PostalAddressDto, nullable: true })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PostalAddressDto)
  address?: PostalAddressDto | null;

  // The whole week, replacing what was there. An empty list removes it,
  // null is refused.
  @ValidateIf((_, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(14)
  @ValidateNested({ each: true })
  @Type(() => OpeningHoursSpecificationDto)
  @IsWeeklyOpeningHours()
  openingHours?: OpeningHoursSpecificationDto[];
}
