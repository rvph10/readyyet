import { LocationDto } from "../../location/dto/location.response.dto";

export class BusinessDto {
  id!: string;
  name!: string;
  ownerId!: string;
  // The Owner's sponsor link is built from it (ADR 0032).
  referralCode!: string;
  // Shown for every Location of the Business (ADR 0051).
  logoUrl!: string | null;
  // ADR 0109: on the Business's pages and every tracking page.
  bannerUrl!: string | null;
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
  // Whether the Owner accepted the current terms (ADR 0130), read here so a
  // Business with no Location left is asked too.
  termsAccepted!: boolean;
}
