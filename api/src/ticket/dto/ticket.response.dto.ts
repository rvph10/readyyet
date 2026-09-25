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

export class TicketDetailDto extends TicketDto {
  statusEvents!: TicketStatusEventDto[];
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
