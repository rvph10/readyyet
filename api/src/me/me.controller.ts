import { Controller, Get } from "@nestjs/common";
import type { User } from "@readyyet/db";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { MeService } from "./me.service";

@Controller("me")
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get()
  async get(@CurrentUser() user: User) {
    const memberships = await this.me.getMemberships(user.id);
    return { id: user.id, email: user.email, name: user.name, memberships };
  }
}
