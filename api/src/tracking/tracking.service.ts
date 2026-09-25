import { Injectable } from "@nestjs/common";
import { showsEstimatedReadyDate } from "@readyyet/shared";
import { toCalendarDate } from "../common/calendar-date";
import { ConflictError, NotFoundError } from "../common/errors/app-error";
import { publicStatusSelect } from "../common/status-select";
import { PrismaService } from "../database/prisma.service";
import { mapsUrl, type OpeningHoursSpecification, toPostalAddress } from "../location/location-info";
import { publicImageUrl } from "../storage/image";
import { StorageService } from "../storage/storage.service";
import { isTrackingLinkExpired } from "./tracking-link";

@Injectable()
export class TrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async findByCode(code: string) {
    // An explicit select, not include: this is the only unauthenticated
    // read of a ticket, a column added to Ticket/Location later must not
    // start leaking here by default. No ids, no customer, no changedBy.
    const ticket = await this.prisma.ticket.findUnique({
      where: { trackingCode: code },
      select: {
        trackingCode: true,
        title: true,
        estimatedReadyDate: true,
        customerCollectedAt: true,
        createdAt: true,
        location: {
          select: {
            name: true,
            contactPhone: true,
            contactEmail: true,
            logoKey: true,
            locale: true,
            timeZone: true,
            streetAddress: true,
            postalCode: true,
            addressLocality: true,
            addressCountry: true,
            openingHours: true,
            deletedAt: true,
          },
        },
        // Only to resolve the page's language, never returned as is.
        customer: { select: { locale: true } },
        currentStatus: publicStatusSelect,
        workflow: {
          select: { steps: { orderBy: { position: "asc" }, select: { position: true, status: publicStatusSelect } } },
        },
        statusEvents: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { createdAt: true, status: publicStatusSelect },
        },
        photos: { orderBy: { createdAt: "asc" }, select: { objectKey: true, createdAt: true } },
      },
    });

    if (!ticket || ticket.location.deletedAt) {
      throw new NotFoundError("Tracking link not found");
    }
    // Same response as an unknown code on purpose, see ADR 0013.
    const latestEvent = ticket.statusEvents[ticket.statusEvents.length - 1];
    if (isTrackingLinkExpired(ticket.currentStatus.code, latestEvent.createdAt)) {
      throw new NotFoundError("Tracking link not found");
    }

    const { name, contactPhone, contactEmail, logoKey, timeZone } = ticket.location;
    const address = toPostalAddress(ticket.location);
    return {
      trackingCode: ticket.trackingCode,
      title: ticket.title,
      estimatedReadyDate: showsEstimatedReadyDate(ticket.currentStatus.code)
        ? toCalendarDate(ticket.estimatedReadyDate)
        : null,
      customerCollectedAt: ticket.customerCollectedAt,
      createdAt: ticket.createdAt,
      // The page opens in the language this ticket's emails use (ADR 0015).
      locale: ticket.customer.locale ?? ticket.location.locale,
      location: {
        name,
        contactPhone,
        contactEmail,
        logoUrl: publicImageUrl(logoKey),
        address,
        mapsUrl: address && mapsUrl(address),
        openingHours: ticket.location.openingHours as OpeningHoursSpecification[],
        timeZone,
      },
      currentStatus: ticket.currentStatus,
      steps: ticket.workflow.steps,
      statusHistory: ticket.statusEvents,
      photos: await Promise.all(
        ticket.photos.map(async (photo) => ({
          url: await this.storage.presignedUrl(photo.objectKey),
          createdAt: photo.createdAt,
        })),
      ),
    };
  }

  // The "stop updates" link (ADR 0015), public like the page it belongs
  // to. Repeating it keeps the first stop time.
  async stopNotifications(code: string) {
    const ticket = await this.findLiveTicket(code);
    await this.prisma.ticket.updateMany({
      where: { id: ticket.id, notificationsStoppedAt: null },
      data: { notificationsStoppedAt: new Date() },
    });
  }

  // "I already picked it up" (ADR 0028): stops the reminders, leaves the
  // Status to staff. Repeating it keeps the first time.
  async markCollected(code: string) {
    const ticket = await this.findLiveTicket(code);
    if (ticket.currentStatus.code !== "READY") {
      throw new ConflictError("Only a READY ticket can be marked as collected");
    }
    await this.prisma.ticket.updateMany({
      where: { id: ticket.id, customerCollectedAt: null },
      data: { customerCollectedAt: new Date() },
    });
  }

  private async findLiveTicket(code: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { trackingCode: code },
      select: {
        id: true,
        location: { select: { deletedAt: true } },
        currentStatus: { select: { code: true } },
        statusEvents: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1, select: { createdAt: true } },
      },
    });
    // Same 404 as the tracking page, see ADR 0013.
    if (
      !ticket ||
      ticket.location.deletedAt ||
      isTrackingLinkExpired(ticket.currentStatus.code, ticket.statusEvents[0].createdAt)
    ) {
      throw new NotFoundError("Tracking link not found");
    }
    return ticket;
  }
}
