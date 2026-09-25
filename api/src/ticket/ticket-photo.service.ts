import { Injectable } from "@nestjs/common";
import { Prisma, Role } from "@readyyet/db";
import type { TicketPhoto } from "@readyyet/db";
import { ConflictError, NotFoundError, UnauthorizedError } from "../common/errors/app-error";
import { parseBigIntId } from "../common/parse-bigint-id";
import { PrismaService } from "../database/prisma.service";
import { roleAt } from "../membership/team-rules";
import { processImage } from "../storage/image";
import { StorageService } from "../storage/storage.service";
import { isTrackingLinkExpired } from "../tracking/tracking-link";

const MAX_PHOTOS_PER_TICKET = 5;

// ADR 0026: up to 5 per Ticket, shown to the Customer, gone with the
// tracking link.
@Injectable()
export class TicketPhotoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async add(locationId: string, ticketId: string, userId: string, file: Buffer) {
    const id = parseBigIntId(ticketId, "Ticket");
    // Before processing the image too, a refused upload shouldn't cost that.
    await this.assertCanAdd(this.prisma, id, locationId);
    const image = await processImage(file, "ticketPhoto");
    await this.storage.put(image.key, image.body, image.contentType);

    try {
      const photo = await this.prisma.$transaction(async (tx) => {
        // Two uploads at once would otherwise both count 4 photos.
        await tx.$executeRaw`SELECT 1 FROM ticket WHERE id = ${id} FOR UPDATE`;
        await this.assertCanAdd(tx, id, locationId);
        return tx.ticketPhoto.create({ data: { ticketId: id, objectKey: image.key, uploadedBy: userId } });
      });
      return this.toResponse(photo);
    } catch (error) {
      await this.storage.delete([image.key]);
      throw error;
    }
  }

  // An Employee deletes only their own photos, so a drop-off photo can't
  // disappear quietly when there's a disagreement about damage.
  async remove(locationId: string, ticketId: string, photoId: string, userId: string) {
    const photo = await this.prisma.ticketPhoto.findFirst({
      where: {
        id: parseBigIntId(photoId, "Photo"),
        ticketId: parseBigIntId(ticketId, "Ticket"),
        ticket: { locationId },
      },
    });
    if (!photo) {
      throw new NotFoundError("Photo not found");
    }
    if (photo.uploadedBy !== userId && (await roleAt(this.prisma, userId, locationId)) === Role.EMPLOYEE) {
      throw new UnauthorizedError("An Employee can only delete the photos they added");
    }

    await this.prisma.ticketPhoto.delete({ where: { id: photo.id } });
    await this.storage.delete([photo.objectKey]);
  }

  // For staff, oldest first like the Status history.
  async forTicket(ticketId: bigint) {
    const photos = await this.prisma.ticketPhoto.findMany({ where: { ticketId }, orderBy: { createdAt: "asc" } });
    return Promise.all(photos.map((photo) => this.toResponse(photo)));
  }

  // The URL is created per request and works 15 minutes, photos are never public.
  private async toResponse(photo: TicketPhoto) {
    return {
      id: photo.id.toString(),
      url: await this.storage.presignedUrl(photo.objectKey),
      uploadedBy: photo.uploadedBy,
      createdAt: photo.createdAt,
    };
  }

  private async assertCanAdd(client: Prisma.TransactionClient, id: bigint, locationId: string) {
    const ticket = await client.ticket.findFirst({
      where: { id, locationId },
      select: {
        currentStatus: { select: { code: true } },
        statusEvents: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1, select: { createdAt: true } },
        _count: { select: { photos: true } },
      },
    });
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }
    // It would be deleted by the next sweep, and the Customer can't see it.
    if (isTrackingLinkExpired(ticket.currentStatus.code, ticket.statusEvents[0].createdAt)) {
      throw new ConflictError("This ticket's tracking link has expired, it can't take photos any more");
    }
    if (ticket._count.photos >= MAX_PHOTOS_PER_TICKET) {
      throw new ConflictError(`A ticket has ${MAX_PHOTOS_PER_TICKET} photos at most, delete one first`);
    }
  }
}
