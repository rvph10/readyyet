import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { User } from "@readyyet/db";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { UpdateMeDto } from "./dto/update-me.dto";
import { MeService } from "./me.service";

@ApiTags("Me")
@Controller("me")
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get()
  @ApiOperation({ summary: "Get the current user and their location memberships (for onboarding routing)" })
  async get(@CurrentUser() user: User) {
    const memberships = await this.me.getMemberships(user.id);
    return { id: user.id, email: user.email, name: user.name, locale: user.locale, memberships };
  }

  @Patch()
  @ApiOperation({ summary: "Change the current user's email language (ADR 0018)" })
  update(@CurrentUser() user: User, @Body() dto: UpdateMeDto) {
    return this.me.update(user.id, dto);
  }
}
