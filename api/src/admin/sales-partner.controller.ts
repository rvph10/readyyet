import { Controller, Get, HttpStatus, Query } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { User } from "@readyyet/db";
import { ApiErrors } from "../common/decorators/api-errors.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CommissionService } from "./commission.service";
import { CommissionPageDto, ListCommissionsQueryDto, SalesPartnerOverviewDto } from "./dto/commission.dto";

@ApiTags("Sales partners")
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.TOO_MANY_REQUESTS)
@ApiCookieAuth()
@Controller("me/sales-partner")
export class SalesPartnerController {
  constructor(private readonly commissions: CommissionService) {}

  @Get()
  @ApiOperation({
    summary: "The current user's sales partner page: their code, the Businesses they brought in and totals (ADR 0032)",
  })
  overview(@CurrentUser() user: User): Promise<SalesPartnerOverviewDto> {
    return this.commissions.overview(user.id);
  }

  @Get("commissions")
  @ApiOperation({ summary: "The current user's commissions, newest first" })
  @ApiErrors(HttpStatus.BAD_REQUEST)
  commissionList(@CurrentUser() user: User, @Query() query: ListCommissionsQueryDto): Promise<CommissionPageDto> {
    return this.commissions.listForSalesPartner(user.id, query);
  }
}
