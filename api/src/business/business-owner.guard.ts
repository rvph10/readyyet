import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { User } from "@readyyet/db";
import type { Request } from "express";
import { BusinessService } from "./business.service";

// On an upload's route: guards run before its interceptor reads the file into
// memory, which a check in the service would only reach afterwards.
@Injectable()
export class BusinessOwnerGuard implements CanActivate {
  constructor(private readonly business: BusinessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user: User }>();
    await this.business.loadOwned(
      request.params.businessId as string,
      request.user.id,
      "Only the business owner can change its images",
    );
    return true;
  }
}
