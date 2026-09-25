import { ApiPropertyOptional } from "@nestjs/swagger";
import { Locale } from "@readyyet/db";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { OptionalNotNull } from "../../common/decorators/optional-not-null.decorator";
import { NAME_MAX_LENGTH } from "../../common/text-limits";
import { canonicalTimeZone, IsRegionTimeZone, IsWeeklyOpeningHours } from "../location-info";
import { OpeningHoursSpecificationDto, PostalAddressDto } from "./location-info.dto";

// Only Google's own hosts: the tracking page sends Customers to this link.
const GOOGLE_REVIEW_HOSTS = [
  "g.page",
  "search.google.com",
  "www.google.com",
  "google.com",
  "maps.google.com",
  "maps.app.goo.gl",
];

export class UpdateLocationDto {
  @OptionalNotNull()
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  name?: string;

  @OptionalNotNull()
  @IsPhoneNumber()
  contactPhone?: string;

  @OptionalNotNull()
  @IsEmail()
  contactEmail?: string;

  @OptionalNotNull()
  @IsEnum(Locale)
  locale?: Locale;

  @OptionalNotNull()
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

  // The whole week, replacing what was there. An empty list removes it.
  @OptionalNotNull()
  @IsArray()
  @ArrayMaxSize(14)
  @ValidateNested({ each: true })
  @Type(() => OpeningHoursSpecificationDto)
  @IsWeeklyOpeningHours()
  openingHours?: OpeningHoursSpecificationDto[];

  // Open days a new Ticket's estimated ready date is set to, null stops
  // prefilling it (ADR 0036).
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  turnaroundDays?: number | null;

  // Google's "write a review" link, Pro only. Setting it turns on the
  // feedback email and the review choice on the tracking page, null turns
  // them off (ADR 0039).
  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true, host_whitelist: GOOGLE_REVIEW_HOSTS })
  @MaxLength(2048)
  googleReviewUrl?: string | null;
}
