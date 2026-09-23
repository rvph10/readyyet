import { Injectable } from "@nestjs/common";
import { ENDED_STATUS_CODES } from "@readyyet/shared";
import { NotFoundError } from "../common/errors/app-error";
import { PrismaService } from "../database/prisma.service";

// A tracking link stops working this long after the ticket ends, see
// docs/decisions/0013-public-tracking-endpoint.md.
const LINK_LIFETIME_AFTER_END_MS = 30 * 24 * 60 * 60 * 1000;

const publicStatus = { select: { code: true, translations: { select: { locale: true, label: true } } } } as const;

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
          select: { name: true, contactPhone: true, contactEmail: true, logoUrl: true, deletedAt: true },
        },
        currentStatus: publicStatus,
        workflow: {
          select: { steps: { orderBy: { position: "asc" }, select: { position: true, status: publicStatus } } },
        },
        statusEvents: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { createdAt: true, status: publicStatus },
        },
      },
    });

    if (!ticket || ticket.location.deletedAt || this.isExpired(ticket)) {
      throw new NotFoundError("Tracking link not found");
    }

    const { name, contactPhone, contactEmail, logoUrl } = ticket.location;
    return {
      trackingCode: ticket.trackingCode,
      title: ticket.title,
      createdAt: ticket.createdAt,
      location: { name, contactPhone, contactEmail, logoUrl },
      currentStatus: ticket.currentStatus,
      steps: ticket.workflow.steps,
      statusHistory: ticket.statusEvents,
    };
  }

  private isExpired(ticket: { currentStatus: { code: string }; statusEvents: { createdAt: Date }[] }) {
    if (!(ENDED_STATUS_CODES as readonly string[]).includes(ticket.currentStatus.code)) {
      return false;
    }
    // Every status change writes an event (the ticket's first one included),
    // so the latest event is when the ticket reached its current status.
    const endedAt = ticket.statusEvents[ticket.statusEvents.length - 1].createdAt;
    return Date.now() - endedAt.getTime() > LINK_LIFETIME_AFTER_END_MS;
  }
}
