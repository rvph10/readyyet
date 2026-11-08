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

export class InsightsPromiseDto {
  // Tickets that reached READY this month, each counted once.
  readied!: number;
  // Those of them that had an estimated ready date.
  dated!: number;
  // Those that reached READY on or before it.
  onTime!: number;
  // From drop-off to READY, null when nothing was readied.
  averageDays!: number | null;
  turnaroundDays!: number | null;
}

export class InsightsUpdatesDto {
  // Emails that went out to Customers this month.
  delivered!: number;
  reminders!: number;
  reviewRequests!: number;
  // Private feedback received this month.
  notes!: number;
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

export class InsightsYourDayDto {
  created!: number;
  moved!: number;
}

export class InsightsDto {
  setup!: InsightsSetupDto;
  received!: InsightsReceivedDto;
  customers!: InsightsCustomersDto;
  promise!: InsightsPromiseDto;
  updates!: InsightsUpdatesDto;
  // The latest Status changes, newest first.
  activity!: InsightsActivityDto[];
  // The signed-in User's own today.
  yourDay!: InsightsYourDayDto;
}
