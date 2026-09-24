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
  logoUrl!: string | null;
  @ApiProperty({ enum: Locale })
  locale!: Locale;
  timeZone!: string;
  address!: PostalAddressDto | null;
  openingHours!: OpeningHoursSpecificationDto[];
  createdAt!: Date;
  updatedAt!: Date;
}
