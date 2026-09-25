import { Injectable } from "@nestjs/common";
import { InvitationStatus } from "@readyyet/db";
import { BillingService } from "../billing/billing.service";
import { PrismaService } from "../database/prisma.service";
import { NotFoundError } from "../common/errors/app-error";
import { processImage } from "../storage/image";
import { StorageService } from "../storage/storage.service";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { toAddressColumns, toOpeningHoursJson } from "./location-info";
import { locationSelect, toLocationResponse } from "./location-select";

@Injectable()
export class LocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly storage: StorageService,
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
        ...(dto.locale !== undefined && { locale: dto.locale }),
        ...(dto.timeZone !== undefined && { timeZone: dto.timeZone }),
        ...(dto.address !== undefined && toAddressColumns(dto.address)),
        ...(dto.openingHours !== undefined && { openingHours: toOpeningHoursJson(dto.openingHours) }),
        ...(dto.turnaroundDays !== undefined && { turnaroundDays: dto.turnaroundDays }),
      },
    });
    return toLocationResponse(location);
  }

  async setLogo(locationId: string, file: Buffer) {
    const image = await processImage(file, "logo");
    await this.storage.put(image.key, image.body, image.contentType);
    return this.replaceLogo(locationId, image.key);
  }

  removeLogo(locationId: string) {
    return this.replaceLogo(locationId, null);
  }

  // The row first, the previous object after (ADR 0026).
  private async replaceLogo(locationId: string, logoKey: string | null) {
    const { logoKey: previous } = await this.prisma.location.findUniqueOrThrow({
      where: { id: locationId },
      select: { logoKey: true },
    });
    const location = await this.prisma.location.update({
      where: { id: locationId },
      ...locationSelect,
      data: { logoKey },
    });
    if (previous) {
      await this.storage.delete([previous]);
    }
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
    // Its pictures go at once, its tracking links stop answering now (ADR 0026).
    const [location, photos] = await Promise.all([
      this.prisma.location.findUniqueOrThrow({ where: { id: locationId }, select: { logoKey: true } }),
      this.prisma.ticketPhoto.findMany({ where: { ticket: { locationId } }, select: { objectKey: true } }),
    ]);
    await this.prisma.$transaction([
      this.prisma.location.update({ where: { id: locationId }, data: { deletedAt: new Date(), logoKey: null } }),
      this.prisma.ticketPhoto.deleteMany({ where: { ticket: { locationId } } }),
      this.prisma.invitation.updateMany({
        where: { locationId, status: InvitationStatus.PENDING },
        data: { status: InvitationStatus.REVOKED },
      }),
      this.prisma.pendingStatusNotification.deleteMany({ where: { statusEvent: { ticket: { locationId } } } }),
    ]);
    await this.storage.delete([
      ...(location.logoKey ? [location.logoKey] : []),
      ...photos.map((photo) => photo.objectKey),
    ]);
  }
}
