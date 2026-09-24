import { Controller, Get, HttpStatus, Param, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@readyyet/db";
import { ApiErrors } from "../common/decorators/api-errors.decorator";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { WorkflowDto } from "./dto/workflow.response.dto";
import { WorkflowService } from "./workflow.service";

@ApiTags("Workflow")
@ApiErrors(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS)
@ApiCookieAuth()
@Controller("locations/:locationId/workflow")
export class WorkflowController {
  constructor(private readonly workflow: WorkflowService) {}

  @Get()
  @LocationRoles(Role.OWNER, Role.ADMIN, Role.EMPLOYEE)
  @UseGuards(LocationMembershipGuard)
  @ApiOperation({ summary: "Get the location's active workflow and its ordered steps" })
  getActive(@Param("locationId") locationId: string): Promise<WorkflowDto> {
    return this.workflow.getActiveWorkflow(locationId);
  }
}
