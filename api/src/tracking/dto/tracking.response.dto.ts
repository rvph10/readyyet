import { ApiProperty } from "@nestjs/swagger";
import { Locale } from "@readyyet/db";
import { PublicStatusDto } from "../../common/dto/status.response.dto";
import { OpeningHoursSpecificationDto, PostalAddressDto } from "../../location/dto/location-info.dto";

export class TrackingLocationDto {
  name!: string;
  contactPhone!: string;
  contactEmail!: string;
  logoUrl!: string | null;
  address!: PostalAddressDto | null;
  // A Google Maps search for the address, null without one.
  mapsUrl!: string | null;
  // Times on the Location's clock, in its timeZone.
  openingHours!: OpeningHoursSpecificationDto[];
  timeZone!: string;
}

export class TrackingStepDto {
  position!: number;
  status!: PublicStatusDto;
}

export class TrackingHistoryEntryDto {
  status!: PublicStatusDto;
  createdAt!: Date;
}

export class TrackingPhotoDto {
  // A presigned bucket URL that works for 15 minutes, reload the page for a new one.
  url!: string;
  createdAt!: Date;
}

export class TrackingDto {
  trackingCode!: string;
  title!: string;
  // A date on the Location's clock, null once the ticket is READY or ended.
  @ApiProperty({ type: String, format: "date", nullable: true })
  estimatedReadyDate!: string | null;
  // Set once the Customer said they picked the item up, the page then
  // hides its "I already picked it up" button.
  customerCollectedAt!: Date | null;
  createdAt!: Date;
  // The Customer's language, or the Location's when they have none.
  @ApiProperty({ enum: Locale })
  locale!: Locale;
  location!: TrackingLocationDto;
  currentStatus!: PublicStatusDto;
  steps!: TrackingStepDto[];
  statusHistory!: TrackingHistoryEntryDto[];
  // Google's "write a review" link, set only on a COMPLETED ticket of a
  // Location that asks for feedback. The page then offers it next to
  // private feedback (ADR 0027, ADR 0039).
  reviewUrl!: string | null;
  // When the Customer sent private feedback, the form is hidden once set.
  feedbackSentAt!: Date | null;
  // Oldest first, who took them isn't shown (ADR 0026).
  photos!: TrackingPhotoDto[];
}
