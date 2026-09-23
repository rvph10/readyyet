import { Body, Controller, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { User } from "@readyyet/db";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { BusinessService } from "./business.service";
import { CreateBusinessDto, CreateLocationDto } from "./dto/create-business.dto";

@ApiTags("Businesses")
@Controller("businesses")
export class BusinessController {
  constructor(private readonly business: BusinessService) {}

  @Post()
  @ApiOperation({ summary: "Create a business with its first location and an owner membership" })
  create(@CurrentUser() user: User, @Body() dto: CreateBusinessDto) {
    return this.business.create(user.id, dto);
  }

  @Post(":businessId/locations")
  @ApiOperation({ summary: "Add another location to an existing business (owner only)" })
  addLocation(@Param("businessId") businessId: string, @CurrentUser() user: User, @Body() dto: CreateLocationDto) {
    return this.business.addLocation(businessId, user.id, dto);
  }
}
