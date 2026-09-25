import { ApiProperty } from "@nestjs/swagger";
import { Locale } from "@readyyet/db";
import { OpeningHoursSpecificationDto, PostalAddressDto } from "./location-info.dto";

export class LocationDto {
  id!: string;
  businessId!: string;
  // A code from GET /catalogue/business-types.
  businessTypeCode!: string;
  name!: string;
  contactPhone!: string;
  contactEmail!: string;
  // Uploaded with PUT /locations/:id/logo. Safe to cache for good, a new
  // logo gets a new URL.
  logoUrl!: string | null;
  @ApiProperty({ enum: Locale })
  locale!: Locale;
  timeZone!: string;
  address!: PostalAddressDto | null;
  openingHours!: OpeningHoursSpecificationDto[];
  // Open days from drop-off to a new Ticket's estimated ready date.
  turnaroundDays!: number | null;
  // Turns on review requests, on a Pro Location (ADR 0039).
  googleReviewUrl!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}
