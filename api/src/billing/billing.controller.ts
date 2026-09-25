import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@readyyet/db";
import { ApiErrors } from "../common/decorators/api-errors.decorator";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { BillingService } from "./billing.service";
import { BillingDto, PromotionCodePreviewDto } from "./dto/billing.response.dto";
import { CheckoutDto, ChoosePlanDto, PromotionCodeDto } from "./dto/choose-plan.dto";
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
  checkout(@Param("locationId") locationId: string, @Body() dto: CheckoutDto): Promise<RedirectDto> {
    return this.billing.checkout(locationId, dto);
  }

  @Post("locations/:locationId/billing/plan")
  @LocationRoles(Role.OWNER, Role.ADMIN)
  @UseGuards(LocationMembershipGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Change a paying location's plan or interval: at once when it costs more per month, at the period end otherwise. The current plan undoes a waiting change or cancellation",
  })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  changePlan(@Param("locationId") locationId: string, @Body() dto: ChoosePlanDto): Promise<BillingDto> {
    return this.billing.changePlan(locationId, dto);
  }

  @Get("locations/:locationId/billing/promotion-codes/:code")
  @LocationRoles(Role.OWNER, Role.ADMIN)
  @UseGuards(LocationMembershipGuard)
  @ApiOperation({
    summary: "Preview a paying location's next invoice with a campaign code, before applying it (ADR 0040)",
  })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  previewPromotionCode(
    @Param("locationId") locationId: string,
    @Param("code") code: string,
  ): Promise<PromotionCodePreviewDto> {
    return this.billing.previewPromotionCode(locationId, code);
  }

  @Post("locations/:locationId/billing/promotion-code")
  @LocationRoles(Role.OWNER, Role.ADMIN)
  @UseGuards(LocationMembershipGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Apply a campaign code to a paying location, replacing its current discount from the next invoice on",
  })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  applyPromotionCode(@Param("locationId") locationId: string, @Body() dto: PromotionCodeDto): Promise<BillingDto> {
    return this.billing.applyPromotionCode(locationId, dto.promotionCode);
  }

  @Post("locations/:locationId/billing/cancel")
  @LocationRoles(Role.OWNER)
  @UseGuards(LocationMembershipGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Stop paying for a location at the end of its period, owner only (ADR 0033)" })
  @ApiErrors(HttpStatus.CONFLICT)
  cancel(@Param("locationId") locationId: string): Promise<BillingDto> {
    return this.billing.cancel(locationId);
  }
}
