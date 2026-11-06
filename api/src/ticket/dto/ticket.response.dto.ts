import { ApiProperty } from "@nestjs/swagger";
import { StatusDto } from "../../common/dto/status.response.dto";
import { CustomerDto } from "../../customer/dto/customer.response.dto";
import type { TicketEmailProblem } from "../../email/email-retry.service";
import { WorkflowStepDto } from "../../workflow/dto/workflow.response.dto";

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
  changedByName!: string;
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
  // Its own Workflow's steps, which the Location's may have moved on from.
  steps!: WorkflowStepDto[];
  // The link the Customer follows, for the QR code at the counter (ADR 0004).
  trackingUrl!: string;
  trackingLinkExpired!: boolean;
  // The latest email to the Customer failed, and is being retried or was given
  // up on (ADR 0081).
  @ApiProperty({ enum: ["RETRYING", "GAVE_UP"], nullable: true })
  emailProblem!: TicketEmailProblem | null;
}

export class TicketListCustomerDto {
  fullName!: string;
  email!: string | null;
  phone!: string | null;
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
  // When it reached its current Status.
  statusSince!: Date;
  customer!: TicketListCustomerDto;
  currentStatus!: StatusDto;
}

export class OverviewTicketDto extends TicketListItemDto {
  // The usual next move, null when there's none (ADR 0016).
  nextStatus!: StatusDto | null;
  // Its emails aren't reaching the Customer, and nothing will retry them.
  emailFails!: boolean;
}

export class OverviewCountsDto {
  open!: number;
  ready!: number;
  late!: number;
  dueToday!: number;
  dueTomorrow!: number;
  // Open and not READY.
  inShop!: number;
  // The Customer says they collected it (ADR 0028).
  toConfirm!: number;
  unhandledFeedback!: number;
}

export class OverviewStepDto {
  status!: StatusDto;
  count!: number;
}

export class OverviewDayDto {
  @ApiProperty({ type: String, format: "date" })
  date!: string;
  count!: number;
}

export class OverviewHandedOverDto {
  // The last 7 days on the Location's clock, today last.
  days!: OverviewDayDto[];
  // The 7 days before those.
  previousWeek!: number;
}

export class TicketOverviewDto {
  counts!: OverviewCountsDto;
  // Open Tickets at each step, in Workflow order.
  steps!: OverviewStepDto[];
  handedOver!: OverviewHandedOverDto;
  // Open Tickets, most urgent first, the first 100 (ADR 0088).
  tickets!: OverviewTicketDto[];
}

export class TicketPageDto {
  items!: TicketListItemDto[];
  // Pass as ?cursor= for the next page, null on the last one.
  nextCursor!: string | null;
}

export class TrackingLinkSentDto {
  sentTo!: string;
}
