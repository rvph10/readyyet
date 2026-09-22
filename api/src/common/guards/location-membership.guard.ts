import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { User } from "@readyyet/db";
import type { Request } from "express";
import { PrismaService } from "../../database/prisma.service";
import { LOCATION_ROLES_KEY } from "../decorators/location-roles.decorator";
import { NotFoundError, UnauthorizedError } from "../errors/app-error";

@Injectable()
export class LocationMembershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<string[]>(LOCATION_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<Request & { user: User }>();
    const locationId = request.params.locationId as string;

    const location = await this.prisma.location.findUnique({ where: { id: locationId } });
    if (!location) {
      throw new NotFoundError("Location not found");
    }

    const membership = await this.prisma.membership.findUnique({
      where: { userId_locationId: { userId: request.user.id, locationId } },
    });
    if (!membership || (roles && roles.length > 0 && !roles.includes(membership.role))) {
      throw new UnauthorizedError("You do not have access to this location");
    }

    return true;
  }
}
