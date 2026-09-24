import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsISO31661Alpha2, IsNotEmpty, IsString, Matches, MaxLength } from "class-validator";
import { DAYS_OF_WEEK, type DayOfWeek } from "../location-info";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// schema.org's PostalAddress.
export class PostalAddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  streetAddress!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  postalCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  addressLocality!: string;

  // ISO 3166-1 alpha-2, like "BE".
  @Matches(/^[A-Z]{2}$/)
  @IsISO31661Alpha2()
  addressCountry!: string;
}

// schema.org's OpeningHoursSpecification, times on the Location's clock.
export class OpeningHoursSpecificationDto {
  @ApiProperty({ enum: DAYS_OF_WEEK })
  @IsIn(DAYS_OF_WEEK)
  dayOfWeek!: DayOfWeek;

  // "HH:MM", 24-hour.
  @Matches(TIME)
  opens!: string;

  @Matches(TIME)
  closes!: string;
}
