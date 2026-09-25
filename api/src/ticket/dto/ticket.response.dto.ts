import { ApiProperty } from "@nestjs/swagger";
import { StatusDto } from "../../common/dto/status.response.dto";
import { CustomerDto } from "../../customer/dto/customer.response.dto";

export class TicketDto {
  id!: string;
  trackingCode!: string;
  title!: string;
  description!: string | null;
  // Set when the Customer used "stop updates", so staff see why no email went out.
  notificationsStoppedAt!: Date | null;
  @ApiProperty({ type: String, format: "date", nullable: true })
  estimatedReadyDate!: string | null;
  // When the Customer said they picked the item up, shown as "Customer
  // says collected" (ADR 0028).
  customerCollectedAt!: Date | null;
  createdAt!: Date;
  customer!: CustomerDto;
  currentStatus!: StatusDto;
}

export class TicketStatusEventDto {
  id!: string;
  // The User who made the change.
  changedBy!: string;
  status!: StatusDto;
  createdAt!: Date;
}

export class TicketPhotoDto {
  id!: string;
  // A presigned bucket URL that works for 15 minutes, fetch the Ticket again for a new one.
  url!: string;
  // The User who added it.
  uploadedBy!: string;
  createdAt!: Date;
}

export class TicketDetailDto extends TicketDto {
  statusEvents!: TicketStatusEventDto[];
  // Oldest first, 5 at most (ADR 0026).
  photos!: TicketPhotoDto[];
}

export class TicketListCustomerDto {
  fullName!: string;
}

export class TicketListItemDto {
  id!: string;
  trackingCode!: string;
  title!: string;
  @ApiProperty({ type: String, format: "date", nullable: true })
  estimatedReadyDate!: string | null;
  // When the Customer said they picked the item up, shown as "Customer
  // says collected" (ADR 0028).
  customerCollectedAt!: Date | null;
  createdAt!: Date;
  customer!: TicketListCustomerDto;
  currentStatus!: StatusDto;
}

export class TicketPageDto {
  items!: TicketListItemDto[];
  // Pass as ?cursor= for the next page, null on the last one.
  nextCursor!: string | null;
}

export class TrackingLinkSentDto {
  sentTo!: string;
}
