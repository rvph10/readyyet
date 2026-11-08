import { StatusDto } from "../../common/dto/status.response.dto";

export class InsightsSetupDto {
  address!: boolean;
  openingHours!: boolean;
  turnaround!: boolean;
  // Without it no Customer gets the feedback email.
  reviewLink!: boolean;
  logo!: boolean;
  // Someone else is a member or has been invited.
  team!: boolean;
  firstTicket!: boolean;
  firstHandover!: boolean;
}

export class InsightsMonthDto {
  // "YYYY-MM" on the Location's clock.
  month!: string;
  received!: number;
}

export class InsightsReceivedDto {
  // The last 6 months, this one last.
  months!: InsightsMonthDto[];
  // Last month up to the same day of the month, to compare like with like.
  lastMonthSoFar!: number;
}

export class InsightsCustomersDto {
  // Among Customers with a Ticket this month: their first ever, or not.
  new!: number;
  returning!: number;
}

export class InsightsActivityDto {
  id!: string;
  ticketId!: string;
  ticketTitle!: string;
  customerName!: string;
  status!: StatusDto;
  changedBy!: string;
  changedByName!: string;
  createdAt!: Date;
}

export class InsightsDto {
  setup!: InsightsSetupDto;
  received!: InsightsReceivedDto;
  customers!: InsightsCustomersDto;
  // The latest Status changes, newest first.
  activity!: InsightsActivityDto[];
}
