import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiErrors } from "../common/decorators/api-errors.decorator";
import { MarkSalesPartnerDto, SalesPartnerDto } from "./dto/sales-partner.dto";
import { PlatformAdminGuard } from "./platform-admin";
import { SalesPartnerService } from "./sales-partner.service";

@ApiTags("Admin")
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.TOO_MANY_REQUESTS)
@ApiCookieAuth()
@Controller("admin")
@UseGuards(PlatformAdminGuard)
export class AdminController {
  constructor(private readonly salesPartners: SalesPartnerService) {}

  @Get("sales-partners")
  @ApiOperation({ summary: "List the sales partners (platform admin only, ADR 0032)" })
  listSalesPartners(): Promise<SalesPartnerDto[]> {
    return this.salesPartners.list();
  }

  @Post("sales-partners")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Make the user with this email a sales partner, giving them a referral code" })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  markSalesPartner(@Body() dto: MarkSalesPartnerDto): Promise<SalesPartnerDto> {
    return this.salesPartners.mark(dto.email);
  }

  @Delete("sales-partners/:userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Stop a user being a sales partner, commissions already recorded stay (ADR 0040)" })
  @ApiErrors(HttpStatus.NOT_FOUND)
  removeSalesPartner(@Param("userId") userId: string): Promise<void> {
    return this.salesPartners.remove(userId);
  }
}
