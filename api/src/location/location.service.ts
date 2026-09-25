import { Injectable } from "@nestjs/common";
import { InvitationStatus } from "@readyyet/db";
import { BillingService } from "../billing/billing.service";
import { PrismaService } from "../database/prisma.service";
import { NotFoundError } from "../common/errors/app-error";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { toAddressColumns, toOpeningHoursJson } from "./location-info";
import { locationSelect, toLocationResponse } from "./location-select";

@Injectable()
export class LocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
  ) {}

  async findById(locationId: string) {
    const location = await this.prisma.location.findUnique({ where: { id: locationId }, ...locationSelect });
    if (!location) {
      throw new NotFoundError("Location not found");
    }
    return toLocationResponse(location);
  }

  async update(locationId: string, dto: UpdateLocationDto) {
    const location = await this.prisma.location.update({
      where: { id: locationId },
      ...locationSelect,
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
        ...(dto.contactEmail !== undefined && { contactEmail: dto.contactEmail }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.locale !== undefined && { locale: dto.locale }),
        ...(dto.timeZone !== undefined && { timeZone: dto.timeZone }),
        ...(dto.address !== undefined && toAddressColumns(dto.address)),
        ...(dto.openingHours !== undefined && { openingHours: toOpeningHoursJson(dto.openingHours) }),
        ...(dto.turnaroundDays !== undefined && { turnaroundDays: dto.turnaroundDays }),
      },
    });
    return toLocationResponse(location);
  }

  // A soft delete, final in v1 (ADR 0017): tickets are permanent records.
  // The guard, tracking page and customer emails all treat a deleted
  // Location as gone, this only clears what would otherwise linger.
  async remove(locationId: string) {
    // Stripe first: a Location deleted while still billed would be worse
    // than one still there after its subscription ended, deleting it again
    // finishes the job.
    await this.billing.cancelNow(locationId);
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
