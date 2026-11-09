import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { OpeningHoursSpecificationDto, PostalAddressDto } from "./location-info.dto";

export class SearchGooglePlacesQueryDto {
  // The shop's name and town, as someone would type them into Google Maps.
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  q!: string;
}

export class GooglePlaceDto {
  placeId!: string;
  name!: string;
  formattedAddress!: string;
  @ApiProperty({ type: Number, nullable: true })
  rating!: number | null;
  @ApiProperty({ type: Number, nullable: true })
  ratingCount!: number | null;
  // Google's review form for this place, ready to save as googleReviewUrl.
  reviewUrl!: string;
  // Null unless Google gave all four parts.
  @ApiProperty({ type: PostalAddressDto, nullable: true })
  address!: PostalAddressDto | null;
  // Empty when Google has none, or none ReadyYet can hold (ADR 0126).
  openingHours!: OpeningHoursSpecificationDto[];
}

export class GooglePlacesDto {
  // Google's best match first, at most five.
  places!: GooglePlaceDto[];
}
