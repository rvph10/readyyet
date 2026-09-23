import { Injectable } from "@nestjs/common";
import { Role } from "@readyyet/db";
import { isUUID } from "class-validator";
import { PrismaService } from "../database/prisma.service";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "../common/errors/app-error";
import { CreateBusinessDto, CreateLocationDto } from "./dto/create-business.dto";
import { TransferOwnershipDto } from "./dto/transfer-ownership.dto";
import { UpdateBusinessDto } from "./dto/update-business.dto";

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

  // Owner only, like every Business-wide action (ADR 0002). Members see
  // their Business's name through /me.
  async findOne(businessId: string, userId: string) {
    await this.loadOwned(businessId, userId, "Only the business owner can view it");
    return this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      include: {
        locations: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, createdAt: true },
        },
      },
    });
  }

  async update(businessId: string, userId: string, dto: UpdateBusinessDto) {
    await this.loadOwned(businessId, userId, "Only the business owner can rename it");
    return this.prisma.business.update({ where: { id: businessId }, data: { name: dto.name } });
  }

  async addLocation(businessId: string, userId: string, dto: CreateLocationDto) {
    await this.loadOwned(businessId, userId, "Only the business owner can add a location");

    return this.prisma.location.create({
      data: { businessId, ...(await this.buildLocationWithOwnerMembership(dto, userId)) },
    });
  }

  // ADR 0017: to an Admin of one of its Locations, who becomes OWNER on
  // every Location while the previous owner stays on as ADMIN.
  async transferOwnership(businessId: string, userId: string, dto: TransferOwnershipDto) {
    await this.loadOwned(businessId, userId, "Only the business owner can transfer it");
    if (dto.userId === userId) {
      throw new ConflictError("You already own this business");
    }
    const isAdmin = await this.prisma.membership.count({
      where: { userId: dto.userId, role: Role.ADMIN, location: { businessId, deletedAt: null } },
    });
    if (!isAdmin) {
      throw new ValidationError("The new owner must be an admin at one of this business's locations");
    }

    return this.prisma.$transaction(async (tx) => {
      // Conditional on the owner the request started from, so two
      // concurrent transfers can't both apply.
      const { count } = await tx.business.updateMany({
        where: { id: businessId, ownerId: userId },
        data: { ownerId: dto.userId },
      });
      if (count === 0) {
        throw new ConflictError("This business's owner has just changed");
      }

      // Demoted first: a Location can only have one OWNER membership
      // (membership_one_owner_per_location).
      await tx.membership.updateMany({
        where: { userId, role: Role.OWNER, location: { businessId } },
        data: { role: Role.ADMIN },
      });
      const locations = await tx.location.findMany({ where: { businessId }, select: { id: true } });
      for (const { id: locationId } of locations) {
        await tx.membership.upsert({
          where: { userId_locationId: { userId: dto.userId, locationId } },
          create: { userId: dto.userId, locationId, role: Role.OWNER },
          update: { role: Role.OWNER },
        });
      }

      return tx.business.findUniqueOrThrow({ where: { id: businessId } });
    });
  }

  private async loadOwned(businessId: string, userId: string, forbidden: string) {
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
    // business's own owner can act on it as a whole.
    if (business.ownerId !== userId) {
      throw new UnauthorizedError(forbidden);
    }
    return business;
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
      locale: dto.locale,
      memberships: { create: { userId: ownerId, role: Role.OWNER } },
    };
  }
}
