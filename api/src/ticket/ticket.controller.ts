import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Role } from "@readyyet/db";
import type { User } from "@readyyet/db";
import { ApiErrors } from "../common/decorators/api-errors.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { ListTicketsQueryDto } from "./dto/list-tickets.query.dto";
import { TicketDetailDto, TicketDto, TicketPageDto, TrackingLinkSentDto } from "./dto/ticket.response.dto";
import { UpdateTicketDto } from "./dto/update-ticket.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";
import { TicketService } from "./ticket.service";

@ApiTags("Tickets")
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS)
@ApiCookieAuth()
@Controller("locations/:locationId/tickets")
@LocationRoles(Role.OWNER, Role.ADMIN, Role.EMPLOYEE)
@UseGuards(LocationMembershipGuard)
export class TicketController {
  constructor(private readonly ticket: TicketService) {}

  @Post()
  @ApiOperation({ summary: "Create a ticket (with an inline customer or an existing customerId)" })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.PAYMENT_REQUIRED)
  create(
    @Param("locationId") locationId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateTicketDto,
  ): Promise<TicketDto> {
    return this.ticket.create(locationId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "List tickets for a location, newest first" })
  @ApiErrors(HttpStatus.BAD_REQUEST)
  list(@Param("locationId") locationId: string, @Query() query: ListTicketsQueryDto): Promise<TicketPageDto> {
    return this.ticket.list(locationId, query);
  }

  @Get(":ticketId")
  @ApiOperation({ summary: "Get a ticket's detail with its status timeline" })
  findOne(@Param("locationId") locationId: string, @Param("ticketId") ticketId: string): Promise<TicketDetailDto> {
    return this.ticket.findOne(locationId, ticketId);
  }

  @Patch(":ticketId")
  @ApiOperation({ summary: "Edit a ticket's title/description" })
  @ApiErrors(HttpStatus.BAD_REQUEST)
  update(
    @Param("locationId") locationId: string,
    @Param("ticketId") ticketId: string,
    @Body() dto: UpdateTicketDto,
  ): Promise<TicketDto> {
    return this.ticket.update(locationId, ticketId, dto);
  }

  @Patch(":ticketId/status")
  @ApiOperation({ summary: "Move a ticket to another step of its workflow, following ADR 0016's rules" })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  updateStatus(
    @Param("locationId") locationId: string,
    @Param("ticketId") ticketId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateTicketStatusDto,
  ): Promise<TicketDto> {
    return this.ticket.updateStatus(locationId, ticketId, user.id, dto);
  }

  @Post(":ticketId/resend-link")
  @HttpCode(HttpStatus.OK)
  // Each call emails the customer, a few per minute covers a real mistake.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Email the customer their tracking link again (ADR 0015)" })
  @ApiErrors(HttpStatus.CONFLICT)
  resendTrackingLink(
    @Param("locationId") locationId: string,
    @Param("ticketId") ticketId: string,
  ): Promise<TrackingLinkSentDto> {
    return this.ticket.resendTrackingLink(locationId, ticketId);
  }

  @Post(":ticketId/status/undo")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Undo your own latest status change, within 2 minutes (ADR 0016)" })
  @ApiErrors(HttpStatus.CONFLICT)
  undoStatus(
    @Param("locationId") locationId: string,
    @Param("ticketId") ticketId: string,
    @CurrentUser() user: User,
  ): Promise<TicketDto> {
    return this.ticket.undoStatus(locationId, ticketId, user.id);
  }
}
