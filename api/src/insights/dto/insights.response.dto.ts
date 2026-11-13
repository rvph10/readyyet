import { ApiProperty } from "@nestjs/swagger";
import { Role } from "@readyyet/db";
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
  changedByAvatarUrl!: string | null;
  // Still on the team, so with a profile here (ADR 0142).
  changedByMember!: boolean;
  createdAt!: Date;
}

export class InsightsDto {
  setup!: InsightsSetupDto;
  received!: InsightsReceivedDto;
  customers!: InsightsCustomersDto;
  // The latest Status changes, newest first.
  activity!: InsightsActivityDto[];
}

// What a member did at this Location (ADR 0142).
export class MemberCountsDto {
  // Tickets they created.
  created!: number;
  // Status changes they made after creating, to any step.
  moved!: number;
  // Of those, to Ready and to Completed.
  ready!: number;
  completed!: number;
}

export class MemberInsightsDto {
  userId!: string;
  name!: string;
  avatarUrl!: string | null;
  @ApiProperty({ enum: Role })
  role!: Role;
  memberSince!: Date;
  // Since the 1st of this month on the Location's clock.
  month!: MemberCountsDto;
  total!: MemberCountsDto;
}
