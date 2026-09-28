import { LocationDto } from "../../location/dto/location.response.dto";

export class BusinessDto {
  id!: string;
  name!: string;
  ownerId!: string;
  // The Owner's sponsor link is built from it (ADR 0032).
  referralCode!: string;
  // Shown for every Location of the Business (ADR 0051).
  logoUrl!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class CreatedBusinessDto extends BusinessDto {
  locations!: LocationDto[];
}

export class BusinessLocationSummaryDto {
  id!: string;
  name!: string;
  createdAt!: Date;
}

export class BusinessWithLocationsDto extends BusinessDto {
  locations!: BusinessLocationSummaryDto[];
}
