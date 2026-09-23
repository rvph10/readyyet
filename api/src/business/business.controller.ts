import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { User } from "@readyyet/db";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { BusinessService } from "./business.service";
import { CreateBusinessDto } from "./dto/create-business.dto";

@ApiTags("Businesses")
@Controller("businesses")
export class BusinessController {
  constructor(private readonly business: BusinessService) {}

  @Post()
  @ApiOperation({ summary: "Create a business with its first location and an owner membership" })
  create(@CurrentUser() user: User, @Body() dto: CreateBusinessDto) {
    return this.business.create(user.id, dto);
  }
}
