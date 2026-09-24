import { ApiProperty } from "@nestjs/swagger";
import { Locale } from "@readyyet/db";

export class LocationDto {
  id!: string;
  businessId!: string;
  businessTypeId!: number;
  name!: string;
  contactPhone!: string;
  contactEmail!: string;
  logoUrl!: string | null;
  @ApiProperty({ enum: Locale })
  locale!: Locale;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
}
