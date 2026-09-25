import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsISO31661Alpha2, IsNotEmpty, IsString, Matches, MaxLength } from "class-validator";
import { DAYS_OF_WEEK, type DayOfWeek } from "../location-info";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// So an address of spaces is refused as empty instead of shown blank.
const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

// schema.org's PostalAddress.
export class PostalAddressDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  streetAddress!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  postalCode!: string;

  @Transform(trim)
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
