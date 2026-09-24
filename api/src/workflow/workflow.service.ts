import { Injectable } from "@nestjs/common";
import type { Locale } from "@readyyet/db";
import { PrismaService } from "../database/prisma.service";
import { NotFoundError } from "../common/errors/app-error";
import { statusSelect } from "../common/status-select";

@Injectable()
export class WorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveWorkflow(locationId: string) {
    const location = await this.prisma.location.findUnique({ where: { id: locationId } });
    if (!location) {
      throw new NotFoundError("Location not found");
    }

    const workflow =
      (await this.prisma.workflow.findFirst({
        where: { locationId, isActive: true },
        include: { steps: { orderBy: { position: "asc" }, select: { position: true, status: statusSelect } } },
      })) ??
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
