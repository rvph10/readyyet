import { Injectable } from "@nestjs/common";
import { Role } from "@readyyet/db";
import { isUUID } from "class-validator";
import { PrismaService } from "../database/prisma.service";
import { NotFoundError, UnauthorizedError } from "../common/errors/app-error";
import { CreateBusinessDto, CreateLocationDto } from "./dto/create-business.dto";

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateBusinessDto) {
    return this.prisma.business.create({
      data: {
        ownerId,
        name: dto.name,
        locations: { create: await this.buildLocationWithOwnerMembership(dto.location, ownerId) },
      },
      include: { locations: true },
    });
  }

  async addLocation(businessId: string, userId: string, dto: CreateLocationDto) {
    // Business.id is a Postgres uuid column, a non-UUID value would
    // otherwise surface as a raw DB error, not a clean 404 (same
    // reasoning as LocationMembershipGuard's own isUUID check).
    if (!isUUID(businessId)) {
      throw new NotFoundError("Business not found");
    }
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      throw new NotFoundError("Business not found");
    }
    // No Membership covers business-wide authority (ADR 0002), only the
    // business's own owner can grow it past its first location.
    if (business.ownerId !== userId) {
      throw new UnauthorizedError("Only the business owner can add a location");
    }

    return this.prisma.location.create({
      data: { businessId, ...(await this.buildLocationWithOwnerMembership(dto, userId)) },
    });
  }

  private async buildLocationWithOwnerMembership(dto: CreateLocationDto, ownerId: string) {
    const businessType = await this.prisma.businessType.findUnique({ where: { code: dto.businessTypeCode } });
    if (!businessType) {
      throw new NotFoundError(`Unknown business type "${dto.businessTypeCode}"`);
    }

    return {
      name: dto.name,
      businessTypeId: businessType.id,
      contactPhone: dto.contactPhone,
      contactEmail: dto.contactEmail,
      memberships: { create: { userId: ownerId, role: Role.OWNER } },
    };
  }
}
