import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { NotFoundError } from "../common/errors/app-error";

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
        include: { steps: { orderBy: { position: "asc" }, include: { status: { include: { translations: true } } } } },
      })) ??
      (await this.prisma.workflow.findFirst({
        where: { businessTypeId: location.businessTypeId, locationId: null, isActive: true },
        include: { steps: { orderBy: { position: "asc" }, include: { status: { include: { translations: true } } } } },
      }));

    // Every business type is seeded with exactly one active default workflow
    // (packages/db/prisma/catalogue.ts), so this indicates a data integrity
    // bug, not a client-facing error.
    if (!workflow) {
      throw new Error(`Location ${locationId} has no active workflow`);
    }

    return this.serialize(workflow);
  }

  private serialize(workflow: {
    id: bigint;
    name: string;
    steps: {
      position: number;
      status: { id: number; code: string; translations: { locale: string; label: string }[] };
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
