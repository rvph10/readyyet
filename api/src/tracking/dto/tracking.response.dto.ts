import { ApiProperty } from "@nestjs/swagger";
import { Locale } from "@readyyet/db";
import { PublicStatusDto } from "../../common/dto/status.response.dto";

export class TrackingLocationDto {
  name!: string;
  contactPhone!: string;
  contactEmail!: string;
  logoUrl!: string | null;
}

export class TrackingStepDto {
  position!: number;
  status!: PublicStatusDto;
}

export class TrackingHistoryEntryDto {
  status!: PublicStatusDto;
  createdAt!: Date;
}

export class TrackingDto {
  trackingCode!: string;
  title!: string;
  createdAt!: Date;
  // The Customer's language, or the Location's when they have none.
  @ApiProperty({ enum: Locale })
  locale!: Locale;
  location!: TrackingLocationDto;
  currentStatus!: PublicStatusDto;
  steps!: TrackingStepDto[];
  statusHistory!: TrackingHistoryEntryDto[];
}
