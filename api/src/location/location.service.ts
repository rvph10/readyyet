import { Injectable } from "@nestjs/common";
import { InvitationStatus } from "@readyyet/db";
import { PrismaService } from "../database/prisma.service";
import { NotFoundError } from "../common/errors/app-error";
import { UpdateLocationDto } from "./dto/update-location.dto";

@Injectable()
export class LocationService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(locationId: string) {
    const location = await this.prisma.location.findUnique({ where: { id: locationId } });
    if (!location) {
      throw new NotFoundError("Location not found");
    }
    return location;
  }

  async update(locationId: string, dto: UpdateLocationDto) {
    return this.prisma.location.update({
      where: { id: locationId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
        ...(dto.contactEmail !== undefined && { contactEmail: dto.contactEmail }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.locale !== undefined && { locale: dto.locale }),
      },
    });
  }

  // A soft delete, final in v1 (ADR 0017): tickets are permanent records.
  // The guard, tracking page and customer emails all treat a deleted
  // Location as gone, this only clears what would otherwise linger.
  async remove(locationId: string) {
    await this.prisma.$transaction([
      this.prisma.location.update({ where: { id: locationId }, data: { deletedAt: new Date() } }),
      this.prisma.invitation.updateMany({
        where: { locationId, status: InvitationStatus.PENDING },
        data: { status: InvitationStatus.REVOKED },
      }),
      this.prisma.pendingStatusNotification.deleteMany({ where: { statusEvent: { ticket: { locationId } } } }),
    ]);
  }
}
