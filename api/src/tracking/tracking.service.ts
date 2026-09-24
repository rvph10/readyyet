import { Injectable } from "@nestjs/common";
import { NotFoundError } from "../common/errors/app-error";
import { publicStatusSelect } from "../common/status-select";
import { PrismaService } from "../database/prisma.service";
import { isTrackingLinkExpired } from "./tracking-link";

@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async findByCode(code: string) {
    // An explicit select, not include: this is the only unauthenticated
    // read of a ticket, a column added to Ticket/Location later must not
    // start leaking here by default. No ids, no customer, no changedBy.
    const ticket = await this.prisma.ticket.findUnique({
      where: { trackingCode: code },
      select: {
        trackingCode: true,
        title: true,
        createdAt: true,
        location: {
          select: { name: true, contactPhone: true, contactEmail: true, logoUrl: true, locale: true, deletedAt: true },
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

    const { name, contactPhone, contactEmail, logoUrl } = ticket.location;
    return {
      trackingCode: ticket.trackingCode,
      title: ticket.title,
      createdAt: ticket.createdAt,
      // The page opens in the language this ticket's emails use (ADR 0015).
      locale: ticket.customer.locale ?? ticket.location.locale,
      location: { name, contactPhone, contactEmail, logoUrl },
      currentStatus: ticket.currentStatus,
      steps: ticket.workflow.steps,
      statusHistory: ticket.statusEvents,
    };
  }

  // The "stop updates" link (ADR 0015), public like the page it belongs
  // to. Repeating it keeps the first stop time.
  async stopNotifications(code: string) {
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

    await this.prisma.ticket.updateMany({
      where: { id: ticket.id, notificationsStoppedAt: null },
      data: { notificationsStoppedAt: new Date() },
    });
  }
}
