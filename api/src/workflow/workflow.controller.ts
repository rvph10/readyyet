import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@readyyet/db";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { WorkflowService } from "./workflow.service";

@ApiTags("Workflow")
@Controller("locations/:locationId/workflow")
export class WorkflowController {
  constructor(private readonly workflow: WorkflowService) {}

  @Get()
  @LocationRoles(Role.OWNER, Role.ADMIN, Role.EMPLOYEE)
  @UseGuards(LocationMembershipGuard)
  @ApiOperation({ summary: "Get the location's active workflow and its ordered steps" })
  getActive(@Param("locationId") locationId: string) {
    return this.workflow.getActiveWorkflow(locationId);
  }
}
