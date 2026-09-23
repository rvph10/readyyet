import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@readyyet/db";
import type { User } from "@readyyet/db";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { ListTicketsQueryDto } from "./dto/list-tickets.query.dto";
import { UpdateTicketDto } from "./dto/update-ticket.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";
import { TicketService } from "./ticket.service";

@ApiTags("Tickets")
@Controller("locations/:locationId/tickets")
@LocationRoles(Role.OWNER, Role.ADMIN, Role.EMPLOYEE)
@UseGuards(LocationMembershipGuard)
export class TicketController {
  constructor(private readonly ticket: TicketService) {}

  @Post()
  @ApiOperation({ summary: "Create a ticket (with an inline customer or an existing customerId)" })
  create(@Param("locationId") locationId: string, @CurrentUser() user: User, @Body() dto: CreateTicketDto) {
    return this.ticket.create(locationId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "List tickets for a location, newest first" })
  list(@Param("locationId") locationId: string, @Query() query: ListTicketsQueryDto) {
    return this.ticket.list(locationId, query);
  }

  @Get(":ticketId")
  @ApiOperation({ summary: "Get a ticket's detail with its status timeline" })
  findOne(@Param("locationId") locationId: string, @Param("ticketId") ticketId: string) {
    return this.ticket.findOne(locationId, ticketId);
  }

  @Patch(":ticketId")
  @ApiOperation({ summary: "Edit a ticket's title/description" })
  update(@Param("locationId") locationId: string, @Param("ticketId") ticketId: string, @Body() dto: UpdateTicketDto) {
    return this.ticket.update(locationId, ticketId, dto);
  }

  @Patch(":ticketId/status")
  @ApiOperation({ summary: "Move a ticket to a real step of its workflow" })
  updateStatus(
    @Param("locationId") locationId: string,
    @Param("ticketId") ticketId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.ticket.updateStatus(locationId, ticketId, user.id, dto);
  }
}
