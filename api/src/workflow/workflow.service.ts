import { Injectable } from "@nestjs/common";
import { Plan, type Locale } from "@readyyet/db";
import { SYSTEM_STATUS_CODES } from "@readyyet/shared";
import { PrismaService } from "../database/prisma.service";
import { NotFoundError, PlanRequiredError, ValidationError } from "../common/errors/app-error";
import { statusSelect } from "../common/status-select";
import type { UpdateWorkflowDto } from "./dto/update-workflow.dto";

const [FIRST_STATUS_CODE, ...LAST_STATUS_CODES] = SYSTEM_STATUS_CODES;

@Injectable()
export class WorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveWorkflow(locationId: string) {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
      include: { subscription: true },
    });
    if (!location) {
      throw new NotFoundError("Location not found");
    }

    // A custom Workflow is Pro's (ADR 0031), on Essentiel it stays stored
    // but new Tickets use the default one.
    const custom =
      location.subscription!.plan === Plan.PRO &&
      (await this.prisma.workflow.findFirst({
        where: { locationId, isActive: true },
        include: { steps: { orderBy: { position: "asc" }, select: { position: true, status: statusSelect } } },
      }));
    const workflow =
      custom ||
      (await this.prisma.workflow.findFirst({
        where: { businessTypeId: location.businessTypeId, locationId: null, isActive: true },
        include: { steps: { orderBy: { position: "asc" }, select: { position: true, status: statusSelect } } },
      }));

    // Every business type is seeded with exactly one active default workflow
    // with at least one step (packages/db/prisma/catalogue.ts), so either
    // condition here indicates a data integrity bug, not a client-facing
    // error. Checked together since callers (e.g. TicketService.create)
    // rely on steps[0] always existing on a returned workflow.
    if (!workflow || workflow.steps.length === 0) {
      throw new Error(`Location ${locationId} has no usable active workflow`);
    }

    return this.serialize(workflow);
  }

  // A Workflow is never edited in place (docs/architecture/data-model.md#workflow-versioning):
  // a new version replaces the active one, open Tickets keep theirs.
  async replaceCustomWorkflow(locationId: string, dto: UpdateWorkflowDto) {
    const subscription = await this.prisma.subscription.findUniqueOrThrow({ where: { locationId } });
    if (subscription.plan !== Plan.PRO) {
      throw new PlanRequiredError("A custom workflow");
    }

    const invalid = dto.statusCodes.filter((code) => (SYSTEM_STATUS_CODES as readonly string[]).includes(code));
    if (invalid.length > 0) {
      throw new ValidationError(`System statuses are added automatically: ${invalid.join(", ")}`);
    }
    const codes = [FIRST_STATUS_CODE, ...dto.statusCodes, ...LAST_STATUS_CODES];
    const statuses = await this.prisma.status.findMany({
      where: { code: { in: codes } },
      select: { id: true, code: true },
    });
    const unknown = dto.statusCodes.filter((code) => !statuses.some((status) => status.code === code));
    if (unknown.length > 0) {
      throw new ValidationError(`Unknown status codes: ${unknown.join(", ")}`);
    }
    const idByCode = new Map(statuses.map((status) => [status.code, status.id]));

    const workflow = await this.prisma.$transaction(async (tx) => {
      await tx.workflow.updateMany({ where: { locationId, isActive: true }, data: { isActive: false } });
      return tx.workflow.create({
        data: {
          locationId,
          name: "Custom",
          steps: { create: codes.map((code, index) => ({ position: index + 1, statusId: idByCode.get(code)! })) },
        },
        include: { steps: { orderBy: { position: "asc" }, select: { position: true, status: statusSelect } } },
      });
    });
    return this.serialize(workflow);
  }

  async resetToDefault(locationId: string) {
    await this.prisma.workflow.updateMany({ where: { locationId, isActive: true }, data: { isActive: false } });
  }

  private serialize(workflow: {
    id: bigint;
    name: string;
    steps: {
      position: number;
      status: { id: number; code: string; translations: { locale: Locale; label: string }[] };
    }[];
  }) {
    return {
      id: workflow.id.toString(),
      name: workflow.name,
      steps: workflow.steps.map((step) => ({
        position: step.position,
        status: step.status,
      })),
    };
  }
}
