import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { User } from "@readyyet/db";
import type { Request } from "express";

// Better Auth's global AuthGuard sets request.user on every request
// (verified by reading @thallesp/nestjs-better-auth's source); this only
// exists because @Session() there returns { session, user } and callers
// here only ever need the user.
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): User => {
  const request = context.switchToHttp().getRequest<Request & { user: User }>();
  return request.user;
});
