import { ApiProperty } from "@nestjs/swagger";
import { Locale } from "@readyyet/db";

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
  createdAt!: Date;
  updatedAt!: Date;
}
