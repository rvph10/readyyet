import { Body, Controller, Post } from "@nestjs/common";
import type { User } from "@readyyet/db";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { BusinessService } from "./business.service";
import { CreateBusinessDto } from "./dto/create-business.dto";

@Controller("businesses")
export class BusinessController {
  constructor(private readonly business: BusinessService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateBusinessDto) {
    return this.business.create(user.id, dto);
  }
}
