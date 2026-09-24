import { Injectable } from "@nestjs/common";
import { Locale, Prisma, Role } from "@readyyet/db";
import { ENDED_STATUS_CODES, isEndedStatus, isNotifyingStatus } from "@readyyet/shared";
import { PrismaService } from "../database/prisma.service";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "../common/errors/app-error";
import { isBigIntId, parseBigIntId } from "../common/parse-bigint-id";
import { statusSelect } from "../common/status-select";
import { NotificationService } from "../notification/notification.service";
import { WorkflowService } from "../workflow/workflow.service";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { ListTicketsQueryDto } from "./dto/list-tickets.query.dto";
import { UpdateTicketDto } from "./dto/update-ticket.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";
import { STATUS_NOTIFICATION_DELAY_MS, STATUS_UNDO_WINDOW_MS } from "./status-rules";
import { generateTrackingCode } from "./tracking-code";

const DEFAULT_LIST_TAKE = 50;

// select, not include: mapDetail spreads the customer, so every column fetched
// here would end up in the response. Same fields as the Customer endpoints.
const DETAIL_INCLUDE = {
  customer: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      locale: true,
      emailBouncedAt: true,
      emailComplainedAt: true,
      createdAt: true,
    },
  },
  currentStatus: statusSelect,
} as const;

// Cursor pagination on (createdAt, id), not OFFSET, see
// docs/architecture/data-model.md#pagination. id breaks createdAt ties.
function encodeCursor(createdAt: Date, id: bigint): string {
  return Buffer.from(`${createdAt.toISOString()}_${id}`).toString("base64url");
}

function decodeCursor(cursor: string): { createdAt: Date; id: bigint } {
  const [createdAt, id] = Buffer.from(cursor, "base64url").toString().split("_");
  const date = new Date(createdAt);
  if (!isBigIntId(id ?? "") || Number.isNaN(date.getTime())) {
    throw new ValidationError("Invalid cursor");
  }
  return { createdAt: date, id: BigInt(id) };
}

type Status = { id: number; code: string; translations: { locale: Locale; label: string }[] };

@Injectable()
export class TicketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflow: WorkflowService,
    private readonly notification: NotificationService,
  ) {}

  async create(locationId: string, userId: string, dto: CreateTicketDto) {
    if (dto.customerId && dto.customer) {
      throw new ValidationError("Provide either customerId or customer, not both");
    }
    if (!dto.customerId && !dto.customer) {
      throw new ValidationError("Provide either customerId or customer");
    }

    const activeWorkflow = await this.workflow.getActiveWorkflow(locationId);
    const firstStep = activeWorkflow.steps[0];
    const workflowId = BigInt(activeWorkflow.id);

    const ticket = await this.prisma.$transaction(async (tx) => {
      let customerId: bigint;
      if (dto.customer) {
        const customer = await tx.customer.create({
          data: {
            locationId,
            fullName: dto.customer.fullName,
            email: dto.customer.email,
            phone: dto.customer.phone,
            locale: dto.customer.locale,
          },
        });
        customerId = customer.id;
      } else {
        // An erased Customer is gone as far as staff can tell (their
        // /customers endpoints 404 too), no new ticket for "[deleted]".
        const customer = await tx.customer.findUnique({
          where: { id_locationId: { id: BigInt(dto.customerId!), locationId }, deletedAt: null },
        });
        if (!customer) {
          throw new NotFoundError("Customer not found");
        }
        customerId = customer.id;
      }

      return tx.ticket.create({
        data: {
          locationId,
          customerId,
          workflowId,
          currentStatusId: firstStep.status.id,
          trackingCode: generateTrackingCode(),
          title: dto.title,
          description: dto.description,
          createdBy: userId,
          statusEvents: { create: { statusId: firstStep.status.id, changedBy: userId } },
        },
        include: DETAIL_INCLUDE,
      });
    });

    // After the transaction commits, never inside it: an email can't be
    // taken back if the insert rolled back. A failed send doesn't fail the
    // ticket, EmailService records it and its retry sweep picks it up.
    await this.notification.sendTicketCreated(ticket.id);

    return this.mapDetail(ticket);
  }

  async resendTrackingLink(locationId: string, ticketId: string) {
    const id = parseBigIntId(ticketId, "Ticket");
    const ticket = await this.prisma.ticket.findFirst({ where: { id, locationId } });
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }
    return this.notification.resendTrackingLink(ticket.id);
  }

  async list(locationId: string, query: ListTicketsQueryDto) {
    const take = query.take ?? DEFAULT_LIST_TAKE;
    const tickets = await this.prisma.ticket.findMany({
      where: { AND: [{ locationId }, ...this.filters(query)] },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      // One extra row tells us whether there's a next page.
      take: take + 1,
      include: {
        customer: { select: { fullName: true } },
        currentStatus: statusSelect,
      },
    });

    const page = tickets.slice(0, take);
    const last = page[page.length - 1];
    return {
      items: page.map((ticket) => ({
        id: ticket.id.toString(),
        trackingCode: ticket.trackingCode,
        title: ticket.title,
        createdAt: ticket.createdAt,
        customer: ticket.customer,
        currentStatus: ticket.currentStatus,
      })),
      nextCursor: tickets.length > take ? encodeCursor(last.createdAt, last.id) : null,
    };
  }

  private filters(query: ListTicketsQueryDto): Prisma.TicketWhereInput[] {
    const filters: Prisma.TicketWhereInput[] = [];

    if (query.q) {
      // Prisma passes contains through to ILIKE as-is, so a typed % or _
      // would otherwise act as a wildcard instead of a literal character.
      const contains = { contains: query.q.replace(/[\\%_]/g, "\\$&"), mode: "insensitive" } as const;
      filters.push({
        OR: [
          { title: contains },
          { description: contains },
          { trackingCode: contains },
          // An erased customer's fields are placeholders, not searchable data.
          { customer: { deletedAt: null, OR: [{ fullName: contains }, { email: contains }, { phone: contains }] } },
        ],
      });
    }
    if (query.status?.length) {
      filters.push({ currentStatus: { code: { in: query.status } } });
    }
    if (query.state) {
      const ended = { in: [...ENDED_STATUS_CODES] };
      filters.push({ currentStatus: { code: query.state === "ended" ? ended : { not: ended } } });
    }
    if (query.createdFrom) {
      filters.push({ createdAt: { gte: new Date(query.createdFrom) } });
    }
    if (query.createdTo) {
      filters.push({ createdAt: { lte: new Date(query.createdTo) } });
    }
    if (query.createdBy) {
      filters.push({ createdBy: query.createdBy });
    }
    if (query.customerId) {
      filters.push({ customerId: BigInt(query.customerId) });
    }
    if (query.cursor) {
      const { createdAt, id } = decodeCursor(query.cursor);
      filters.push({ OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: id } }] });
    }

    return filters;
  }

  async findOne(locationId: string, ticketId: string) {
    const id = parseBigIntId(ticketId, "Ticket");
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, locationId },
      include: {
        ...DETAIL_INCLUDE,
        statusEvents: {
          orderBy: { createdAt: "asc" },
          select: { id: true, createdAt: true, changedBy: true, status: statusSelect },
        },
      },
    });
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    return {
      ...this.mapDetail(ticket),
      statusEvents: ticket.statusEvents.map((event) => ({
        id: event.id.toString(),
        createdAt: event.createdAt,
        changedBy: event.changedBy,
        status: event.status,
      })),
    };
  }

  async update(locationId: string, ticketId: string, dto: UpdateTicketDto) {
    const id = parseBigIntId(ticketId, "Ticket");
    const ticket = await this.prisma.ticket.findFirst({ where: { id, locationId } });
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: DETAIL_INCLUDE,
    });

    return this.mapDetail(updated);
  }

  // Rules from docs/decisions/0016-ticket-status-change-rules.md.
  async updateStatus(locationId: string, ticketId: string, userId: string, dto: UpdateTicketStatusDto) {
    const id = parseBigIntId(ticketId, "Ticket");
    if (dto.statusCode === "RECEIVED") {
      throw new ValidationError("A ticket can't move back to RECEIVED");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findFirst({ where: { id, locationId }, include: { currentStatus: true } });
      if (!ticket) {
        throw new NotFoundError("Ticket not found");
      }

      const step = await tx.workflowStep.findFirst({
        where: { workflowId: ticket.workflowId, status: { code: dto.statusCode } },
      });
      if (!step) {
        throw new ValidationError(`"${dto.statusCode}" is not a step of this ticket's workflow`);
      }

      const from = ticket.currentStatus.code;
      if (step.statusId === ticket.currentStatusId) {
        throw new ConflictError(`The ticket is already ${from}`);
      }
      if (dto.statusCode === "COMPLETED" && from !== "READY") {
        throw new ConflictError("A ticket can only be COMPLETED once it's READY");
      }
      if (isEndedStatus(from)) {
        const membership = await tx.membership.findUniqueOrThrow({
          where: { userId_locationId: { userId, locationId } },
        });
        if (membership.role === Role.EMPLOYEE) {
          throw new UnauthorizedError(`Only an owner or admin can change a ${from} ticket`);
        }
      }

      await this.moveStatus(tx, ticket.id, ticket.currentStatusId, step.statusId);
      await tx.ticketStatusEvent.create({
        data: {
          ticketId: ticket.id,
          workflowId: ticket.workflowId,
          statusId: step.statusId,
          changedBy: userId,
          // Sent later by NotificationService, only if still current (ADR 0015).
          ...(isNotifyingStatus(dto.statusCode) && {
            pendingNotification: { create: { sendAfter: new Date(Date.now() + STATUS_NOTIFICATION_DELAY_MS) } },
          }),
        },
      });
      return tx.ticket.findUniqueOrThrow({ where: { id }, include: DETAIL_INCLUDE });
    });

    return this.mapDetail(updated);
  }

  async undoStatus(locationId: string, ticketId: string, userId: string) {
    const id = parseBigIntId(ticketId, "Ticket");

    const updated = await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findFirst({ where: { id, locationId } });
      if (!ticket) {
        throw new NotFoundError("Ticket not found");
      }

      const [latest, previous] = await tx.ticketStatusEvent.findMany({
        where: { ticketId: id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 2,
      });
      // The first event is the ticket's creation at RECEIVED, not a change.
      if (!previous) {
        throw new ConflictError("There is no status change to undo");
      }
      if (latest.changedBy !== userId) {
        throw new UnauthorizedError("Only the person who made a status change can undo it");
      }
      if (Date.now() - latest.createdAt.getTime() > STATUS_UNDO_WINDOW_MS) {
        throw new ConflictError("A status change can only be undone within 2 minutes");
      }

      await this.moveStatus(tx, id, latest.statusId, previous.statusId);
      await tx.ticketStatusEvent.delete({ where: { id: latest.id } });
      return tx.ticket.findUniqueOrThrow({ where: { id }, include: DETAIL_INCLUDE });
    });

    return this.mapDetail(updated);
  }

  // Conditional on the status the caller read, so two concurrent changes
  // (or a change racing an undo) can't both apply.
  private async moveStatus(tx: Prisma.TransactionClient, ticketId: bigint, fromStatusId: number, toStatusId: number) {
    const { count } = await tx.ticket.updateMany({
      where: { id: ticketId, currentStatusId: fromStatusId },
      data: { currentStatusId: toStatusId },
    });
    if (count === 0) {
      throw new ConflictError("The ticket's status was just changed by someone else, reload and try again");
    }
  }

  private mapDetail(ticket: {
    id: bigint;
    trackingCode: string;
    title: string;
    description: string | null;
    notificationsStoppedAt: Date | null;
    createdAt: Date;
    customer: {
      id: bigint;
      fullName: string;
      email: string | null;
      phone: string | null;
      locale: Locale | null;
      emailBouncedAt: Date | null;
      emailComplainedAt: Date | null;
      createdAt: Date;
    };
    currentStatus: Status;
  }) {
    return {
      id: ticket.id.toString(),
      trackingCode: ticket.trackingCode,
      title: ticket.title,
      description: ticket.description,
      // The Customer used "stop updates", staff see why no email went out.
      notificationsStoppedAt: ticket.notificationsStoppedAt,
      createdAt: ticket.createdAt,
      customer: { ...ticket.customer, id: ticket.customer.id.toString() },
      currentStatus: ticket.currentStatus,
    };
  }
}
