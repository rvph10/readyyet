import { Injectable } from "@nestjs/common";
import { Role } from "@readyyet/db";
import { PrismaService } from "../database/prisma.service";
import { NotFoundError } from "../common/errors/app-error";
import { CreateBusinessDto } from "./dto/create-business.dto";

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateBusinessDto) {
    const businessType = await this.prisma.businessType.findUnique({
      where: { code: dto.location.businessTypeCode },
    });
    if (!businessType) {
      throw new NotFoundError(`Unknown business type "${dto.location.businessTypeCode}"`);
    }

    return this.prisma.business.create({
      data: {
        ownerId,
        name: dto.name,
        locations: {
          create: {
            name: dto.location.name,
            businessTypeId: businessType.id,
            contactPhone: dto.location.contactPhone,
            contactEmail: dto.location.contactEmail,
            memberships: { create: { userId: ownerId, role: Role.OWNER } },
          },
        },
      },
      include: { locations: true },
    });
  }
}
