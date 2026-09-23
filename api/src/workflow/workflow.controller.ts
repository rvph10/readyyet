import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { Role } from "@readyyet/db";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { WorkflowService } from "./workflow.service";

@Controller("locations/:locationId/workflow")
export class WorkflowController {
  constructor(private readonly workflow: WorkflowService) {}

  @Get()
  @LocationRoles(Role.OWNER, Role.ADMIN, Role.EMPLOYEE)
  @UseGuards(LocationMembershipGuard)
  getActive(@Param("locationId") locationId: string) {
    return this.workflow.getActiveWorkflow(locationId);
  }
}
