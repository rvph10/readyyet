import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Put, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@readyyet/db";
import { ApiError, ApiErrors } from "../common/decorators/api-errors.decorator";
import { LocationRoles } from "../common/decorators/location-roles.decorator";
import { LocationMembershipGuard } from "../common/guards/location-membership.guard";
import { UpdateWorkflowDto } from "./dto/update-workflow.dto";
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

  @Put()
  @LocationRoles(Role.OWNER, Role.ADMIN)
  @UseGuards(LocationMembershipGuard)
  @ApiOperation({
    summary: "Replace the location's custom workflow, Pro only",
    description:
      "Takes the operational statuses in order. RECEIVED is added first and READY, COMPLETED, CANCELLED, REJECTED last. Open tickets keep the workflow they were created with.",
  })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  @ApiError(HttpStatus.PAYMENT_REQUIRED, "PLAN_REQUIRED: custom workflows are a Pro feature")
  replace(@Param("locationId") locationId: string, @Body() dto: UpdateWorkflowDto): Promise<WorkflowDto> {
    return this.workflow.replaceCustomWorkflow(locationId, dto);
  }

  @Delete()
  @LocationRoles(Role.OWNER, Role.ADMIN)
  @UseGuards(LocationMembershipGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Go back to the business type's default workflow for new tickets" })
  reset(@Param("locationId") locationId: string) {
    return this.workflow.resetToDefault(locationId);
  }
}
