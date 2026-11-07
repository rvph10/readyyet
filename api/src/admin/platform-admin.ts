import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { User } from "@readyyet/db";
import type { Request } from "express";
import { UnauthorizedError } from "../common/errors/app-error";

// One person runs ReadyYet, named in configuration rather than by a role in
// the database (ADR 0032). Read on each call, like WEB_URL, so tests can set it.
export function isPlatformAdmin(email: string) {
  const admins = (process.env.PLATFORM_ADMIN_EMAILS ?? "").split(",").map((admin) => admin.trim().toLowerCase());
  return admins.includes(email.toLowerCase());
}

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<Request & { user: User }>();
    if (!isPlatformAdmin(user.email)) {
      throw new UnauthorizedError("Only the platform admin can do this");
    }
    return true;
  }
}
