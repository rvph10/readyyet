import { Injectable } from "@nestjs/common";
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
    const tickets = await this.prisma.ticket.findMany({
      where: { locationId },
      orderBy: { createdAt: "desc" },
      take: query.take ?? DEFAULT_LIST_TAKE,
      skip: query.skip ?? 0,
      include: {
        customer: { select: { fullName: true } },
        currentStatus: { include: { translations: true } },
      },
    });

    return tickets.map((ticket) => ({
      id: ticket.id.toString(),
      trackingCode: ticket.trackingCode,
      title: ticket.title,
      createdAt: ticket.createdAt,
      customer: ticket.customer,
      currentStatus: ticket.currentStatus,
    }));
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
