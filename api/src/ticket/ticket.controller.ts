import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@readyyet/db";
import type { User } from "@readyyet/db";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { ListTicketsQueryDto } from "./dto/list-tickets.query.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";
import { TicketService } from "./ticket.service";

@Controller("locations/:locationId/tickets")
@LocationRoles(Role.OWNER, Role.ADMIN, Role.EMPLOYEE)
@UseGuards(LocationMembershipGuard)
export class TicketController {
  constructor(private readonly ticket: TicketService) {}

  @Post()
  create(@Param("locationId") locationId: string, @CurrentUser() user: User, @Body() dto: CreateTicketDto) {
    return this.ticket.create(locationId, user.id, dto);
  }

  @Get()
  list(@Param("locationId") locationId: string, @Query() query: ListTicketsQueryDto) {
    return this.ticket.list(locationId, query);
  }

  @Get(":ticketId")
  findOne(@Param("locationId") locationId: string, @Param("ticketId") ticketId: string) {
    return this.ticket.findOne(locationId, ticketId);
  }

  @Patch(":ticketId/status")
  updateStatus(
    @Param("locationId") locationId: string,
    @Param("ticketId") ticketId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.ticket.updateStatus(locationId, ticketId, user.id, dto);
  }
}
