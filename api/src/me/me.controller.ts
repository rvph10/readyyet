import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { User } from "@readyyet/db";
import { Session } from "@thallesp/nestjs-better-auth";
import type { UserSession } from "@thallesp/nestjs-better-auth";
import { ApiError, ApiErrors } from "../common/decorators/api-errors.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { MeDto, MeWithMembershipsDto } from "./dto/me.response.dto";
import { UpdateMeDto } from "./dto/update-me.dto";
import { MeService } from "./me.service";

@ApiTags("Me")
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.TOO_MANY_REQUESTS)
@ApiCookieAuth()
@Controller("me")
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get()
  @ApiOperation({ summary: "Get the current user and their location memberships (for onboarding routing)" })
  async get(@CurrentUser() user: User): Promise<MeWithMembershipsDto> {
    const memberships = await this.me.getMemberships(user.id);
    return { id: user.id, email: user.email, name: user.name, locale: user.locale, memberships };
  }

  @Patch()
  @ApiOperation({ summary: "Change the current user's email language (ADR 0018)" })
  @ApiErrors(HttpStatus.BAD_REQUEST)
  update(@CurrentUser() user: User, @Body() dto: UpdateMeDto): Promise<MeDto> {
    return this.me.update(user.id, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete the current user's account, needs a sign-in in the last 10 minutes (ADR 0018)",
  })
  @ApiError(HttpStatus.FORBIDDEN, "REAUTHENTICATION_REQUIRED: the session is too old, sign in again first")
  @ApiErrors(HttpStatus.CONFLICT)
  remove(@Session() session: UserSession) {
    return this.me.remove(session.user.id, new Date(session.session.createdAt));
  }
}
