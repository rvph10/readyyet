import { Injectable } from "@nestjs/common";
import { Prisma } from "@readyyet/db";
import { ENDED_STATUS_CODES } from "@readyyet/shared";
import { PrismaService } from "../database/prisma.service";
import { NotFoundError, ValidationError } from "../common/errors/app-error";
import { parseBigIntId } from "../common/parse-bigint-id";
import { WorkflowService } from "../workflow/workflow.service";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { ListTicketsQueryDto } from "./dto/list-tickets.query.dto";
import { UpdateTicketDto } from "./dto/update-ticket.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";
import { generateTrackingCode } from "./tracking-code";

const DEFAULT_LIST_TAKE = 50;

// Cursor pagination on (createdAt, id), not OFFSET, see
// docs/architecture/data-model.md#pagination. id breaks createdAt ties.
function encodeCursor(createdAt: Date, id: bigint): string {
  return Buffer.from(`${createdAt.toISOString()}_${id}`).toString("base64url");
}

function decodeCursor(cursor: string): { createdAt: Date; id: bigint } {
  const [createdAt, id] = Buffer.from(cursor, "base64url").toString().split("_");
  const date = new Date(createdAt);
  if (!/^\d+$/.test(id ?? "") || Number.isNaN(date.getTime())) {
    throw new ValidationError("Invalid cursor");
  }
  return { createdAt: date, id: BigInt(id) };
}

type Status = { id: number; code: string; translations: { locale: string; label: string }[] };

@Injectable()
export class TicketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflow: WorkflowService,
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
          data: { locationId, fullName: dto.customer.fullName, email: dto.customer.email, phone: dto.customer.phone },
        });
        customerId = customer.id;
      } else {
        const customer = await tx.customer.findUnique({
          where: { id_locationId: { id: BigInt(dto.customerId!), locationId } },
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
        include: { customer: true, currentStatus: { include: { translations: true } } },
      });
    });

    return this.mapDetail(ticket);
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
        currentStatus: { include: { translations: true } },
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
        customer: true,
        currentStatus: { include: { translations: true } },
        statusEvents: { orderBy: { createdAt: "asc" }, include: { status: { include: { translations: true } } } },
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
      include: { customer: true, currentStatus: { include: { translations: true } } },
    });

    return this.mapDetail(updated);
  }

  async updateStatus(locationId: string, ticketId: string, userId: string, dto: UpdateTicketStatusDto) {
    const id = parseBigIntId(ticketId, "Ticket");
    const ticket = await this.prisma.ticket.findFirst({ where: { id, locationId } });
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    const step = await this.prisma.workflowStep.findFirst({
      where: { workflowId: ticket.workflowId, status: { code: dto.statusCode } },
      include: { status: { include: { translations: true } } },
    });
    if (!step) {
      throw new ValidationError(`"${dto.statusCode}" is not a step of this ticket's workflow`);
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        currentStatusId: step.statusId,
        statusEvents: { create: { statusId: step.statusId, changedBy: userId } },
      },
      include: { customer: true, currentStatus: { include: { translations: true } } },
    });

    return this.mapDetail(updated);
  }

  private mapDetail(ticket: {
    id: bigint;
    trackingCode: string;
    title: string;
    description: string | null;
    createdAt: Date;
    customer: { id: bigint; fullName: string; email: string | null; phone: string | null };
    currentStatus: Status;
  }) {
    return {
      id: ticket.id.toString(),
      trackingCode: ticket.trackingCode,
      title: ticket.title,
      description: ticket.description,
      createdAt: ticket.createdAt,
      customer: { ...ticket.customer, id: ticket.customer.id.toString() },
      currentStatus: ticket.currentStatus,
    };
  }
}
