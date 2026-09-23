import { Body, Controller, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { User } from "@readyyet/db";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { BusinessService } from "./business.service";
import { CreateBusinessDto, CreateLocationDto } from "./dto/create-business.dto";
import { TransferOwnershipDto } from "./dto/transfer-ownership.dto";
import { UpdateBusinessDto } from "./dto/update-business.dto";

@ApiTags("Businesses")
@Controller("businesses")
export class BusinessController {
  constructor(private readonly business: BusinessService) {}

  @Post()
  @ApiOperation({ summary: "Create a business with its first location and an owner membership" })
  create(@CurrentUser() user: User, @Body() dto: CreateBusinessDto) {
    return this.business.create(user.id, dto);
  }

  @Get(":businessId")
  @ApiOperation({ summary: "Get a business with its locations (owner only)" })
  findOne(@Param("businessId") businessId: string, @CurrentUser() user: User) {
    return this.business.findOne(businessId, user.id);
  }

  @Patch(":businessId")
  @ApiOperation({ summary: "Rename a business (owner only)" })
  update(@Param("businessId") businessId: string, @CurrentUser() user: User, @Body() dto: UpdateBusinessDto) {
    return this.business.update(businessId, user.id, dto);
  }

  @Post(":businessId/locations")
  @ApiOperation({ summary: "Add another location to an existing business (owner only)" })
  addLocation(@Param("businessId") businessId: string, @CurrentUser() user: User, @Body() dto: CreateLocationDto) {
    return this.business.addLocation(businessId, user.id, dto);
  }

  @Post(":businessId/transfer-ownership")
  @HttpCode(200)
  @ApiOperation({ summary: "Hand the business to one of its admins, the owner stays on as admin (ADR 0017)" })
  transferOwnership(
    @Param("businessId") businessId: string,
    @CurrentUser() user: User,
    @Body() dto: TransferOwnershipDto,
  ) {
    return this.business.transferOwnership(businessId, user.id, dto);
  }
}
