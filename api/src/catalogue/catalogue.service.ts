import { Injectable } from "@nestjs/common";
import { SYSTEM_STATUS_CODES } from "@readyyet/shared";
import { publicStatusSelect } from "../common/public-status-select";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class CatalogueService {
  constructor(private readonly prisma: PrismaService) {}

  async listBusinessTypes() {
    const businessTypes = await this.prisma.businessType.findMany({
      orderBy: { id: "asc" },
      select: {
        code: true,
        translations: { select: { locale: true, label: true } },
        workflows: {
          where: { locationId: null, isActive: true },
          select: { steps: { orderBy: { position: "asc" }, select: { position: true, status: publicStatusSelect } } },
        },
      },
    });

    // Every business type is seeded with exactly one active default
    // workflow (packages/db/prisma/catalogue.ts), and the partial unique
    // index on workflow(business_type_id) WHERE is_active allows no more.
    return businessTypes.map(({ workflows, ...businessType }) => ({
      ...businessType,
      defaultWorkflow: workflows[0],
    }));
  }

  async listStatuses() {
    const statuses = await this.prisma.status.findMany({ orderBy: { id: "asc" }, ...publicStatusSelect });
    return statuses.map((status) => ({
      ...status,
      isSystem: (SYSTEM_STATUS_CODES as readonly string[]).includes(status.code),
    }));
  }
}
