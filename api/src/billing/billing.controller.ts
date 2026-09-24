import { Body, Controller, Get, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@readyyet/db";
import { ApiErrors } from "../common/decorators/api-errors.decorator";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { BillingService } from "./billing.service";
import { BillingDto } from "./dto/billing.response.dto";
import { ChoosePlanDto } from "./dto/choose-plan.dto";
import { RedirectDto } from "./dto/redirect.response.dto";

@ApiTags("Billing")
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS)
@ApiCookieAuth()
@Controller()
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get("locations/:locationId/billing")
  @LocationRoles(Role.OWNER, Role.ADMIN)
  @UseGuards(LocationMembershipGuard)
  @ApiOperation({ summary: "Get a location's plan, trial and payment state (ADR 0031)" })
  get(@Param("locationId") locationId: string): Promise<BillingDto> {
    return this.billing.get(locationId);
  }

  @Post("locations/:locationId/billing/checkout")
  @LocationRoles(Role.OWNER, Role.ADMIN)
  @UseGuards(LocationMembershipGuard)
  @ApiOperation({ summary: "Start paying for a location, returns the Stripe Checkout page to open" })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  checkout(@Param("locationId") locationId: string, @Body() dto: ChoosePlanDto): Promise<RedirectDto> {
    return this.billing.checkout(locationId, dto);
  }
}
