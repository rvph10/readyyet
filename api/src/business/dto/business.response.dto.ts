import { LocationDto } from "../../location/dto/location.response.dto";

export class BusinessDto {
  id!: string;
  name!: string;
  ownerId!: string;
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
