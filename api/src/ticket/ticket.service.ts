import { Injectable } from "@nestjs/common";
import { EmailStatus, Locale, Prisma, Role } from "@readyyet/db";
import {
  calendarDateIn,
  ENDED_STATUS_CODES,
  isEndedStatus,
  isNotifyingStatus,
  LONG_WAIT_DAYS,
  turnaroundReadyDate,
} from "@readyyet/shared";
import { customerIdsNamed, phoneDigits } from "../customer/customer-search";
import { PrismaService } from "../database/prisma.service";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "../common/errors/app-error";
import { fromCalendarDate, toCalendarDate } from "../common/calendar-date";
import { parseBigIntId } from "../common/parse-bigint-id";
import { statusSelect } from "../common/status-select";
import { NotificationService } from "../notification/notification.service";
import { nextReadyReminderAt } from "../notification/ready-reminders";
import { WorkflowService } from "../workflow/workflow.service";
import { BillingService } from "../billing/billing.service";
import { EmailRetryService } from "../email/email-retry.service";
import { isTrackingLinkExpired, trackingUrl } from "../tracking/tracking-link";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { ListTicketsQueryDto } from "./dto/list-tickets.query.dto";
import { UpdateTicketDto } from "./dto/update-ticket.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";
import { TicketPhotoService } from "./ticket-photo.service";
import { STATUS_NOTIFICATION_DELAY_MS, STATUS_UNDO_WINDOW_MS } from "./status-rules";
import { generateTrackingCode } from "./tracking-code";
import { NEEDS_FOLLOW_UP } from "../feedback/asks-for-feedback";

const DEFAULT_LIST_TAKE = 50;
const OVERVIEW_TICKETS = 100;
const STOPPED_STATUS_CODES = ["CANCELLED", "REJECTED"];

const LIST_INCLUDE = {
  customer: { select: { fullName: true, email: true, phone: true } },
  currentStatus: statusSelect,
  // The latest, for when the Ticket reached its current Status.
  statusEvents: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1, select: { createdAt: true } },
} satisfies Prisma.TicketInclude;

type ListTicket = Prisma.TicketGetPayload<{ include: typeof LIST_INCLUDE }>;

function ticketOrder({ sort, dir = "asc" }: ListTicketsQueryDto): Prisma.TicketOrderByWithRelationInput[] {
  const orders = {
    number: { id: dir },
    customer: { customer: { fullName: dir } },
    title: { title: dir },
    // A Workflow's order lives on its steps, which a sort can't reach, so this
    // groups a Status's Tickets together rather than following the Workflow.
    status: { currentStatusId: dir },
    expected: { estimatedReadyDate: { sort: dir, nulls: "last" } },
    received: { createdAt: dir },
  } satisfies Record<NonNullable<ListTicketsQueryDto["sort"]>, Prisma.TicketOrderByWithRelationInput>;
  // id breaks ties, so a row can't land on two pages.
  return [sort ? orders[sort] : { createdAt: "desc" }, { id: "desc" }];
}

function listItem(ticket: ListTicket) {
  return {
    id: ticket.id.toString(),
    trackingCode: ticket.trackingCode,
    title: ticket.title,
    estimatedReadyDate: toCalendarDate(ticket.estimatedReadyDate),
    customerCollectedAt: ticket.customerCollectedAt,
    createdAt: ticket.createdAt,
    statusSince: ticket.statusEvents[0].createdAt,
    customer: {
      fullName: ticket.customer.fullName,
      email: ticket.customer.email,
      phone: ticket.customer.phone,
    },
    currentStatus: ticket.currentStatus,
  };
}

function addDays(date: string, days: number) {
  const moved = fromCalendarDate(date);
  moved.setUTCDate(moved.getUTCDate() + days);
  return toCalendarDate(moved)!;
}

interface Ranked {
  ticket: { statusEvents: { createdAt: Date }[]; createdAt: Date };
  date: string | null;
  // 0 late, 1 ready, 2 the rest.
  rank: number;
}

// Late first, then what's waiting to be collected, longest first, then what's
// due soonest, and what has no date last.
function byUrgency(a: Ranked, b: Ranked) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  if (a.rank === 1) return a.ticket.statusEvents[0].createdAt.getTime() - b.ticket.statusEvents[0].createdAt.getTime();
  if (a.date !== b.date) return (a.date ?? "9999").localeCompare(b.date ?? "9999");
  return a.ticket.createdAt.getTime() - b.ticket.createdAt.getTime();
}

// The step after the current one, the same usual move as the Ticket page's.
// COMPLETED only follows READY (ADR 0016).
function nextStatus<S extends { code: string }>(steps: { position: number; status: S }[], currentCode: string) {
  const position = steps.find(({ status }) => status.code === currentCode)?.position ?? -1;
  const next = steps.find(
    ({ status, position: at }) =>
      at > position &&
      !STOPPED_STATUS_CODES.includes(status.code) &&
      (status.code !== "COMPLETED" || currentCode === "READY"),
  );
  return next?.status ?? null;
}

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

type Status = { id: number; code: string; translations: { locale: Locale; label: string }[] };

// What a Ticket's estimated ready date is checked and computed against.
const READY_DATE_LOCATION_SELECT = { timeZone: true, openingHours: true, turnaroundDays: true } as const;
type ReadyDateLocation = Prisma.LocationGetPayload<{ select: typeof READY_DATE_LOCATION_SELECT }>;

// A promise to the Customer can't already be broken when it's made.
function assertNotPast(date: string, location: ReadyDateLocation) {
  if (date < calendarDateIn(new Date(), location.timeZone)) {
    throw new ValidationError("The estimated ready date can't be in the past");
  }
}

@Injectable()
export class TicketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflow: WorkflowService,
    private readonly notification: NotificationService,
    private readonly billing: BillingService,
    private readonly photos: TicketPhotoService,
    private readonly emailRetry: EmailRetryService,
  ) {}

  async create(locationId: string, userId: string, dto: CreateTicketDto) {
    if (dto.customerId && dto.customer) {
      throw new ValidationError("Provide either customerId or customer, not both");
    }
    if (!dto.customerId && !dto.customer) {
      throw new ValidationError("Provide either customerId or customer");
    }

    await this.billing.assertNotFrozen(locationId);
    const location = await this.prisma.location.findUniqueOrThrow({
      where: { id: locationId },
      select: READY_DATE_LOCATION_SELECT,
    });
    const estimatedReadyDate = this.initialReadyDate(location, dto.estimatedReadyDate);
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
          estimatedReadyDate: estimatedReadyDate && fromCalendarDate(estimatedReadyDate),
          createdBy: userId,
          // In this transaction, so the Ticket can't exist with its email lost,
          // and nothing about the email can fail this request (ADR 0081).
          trackingEmailDueAt: new Date(),
          statusEvents: { create: { statusId: firstStep.status.id, changedBy: userId } },
        },
        include: DETAIL_INCLUDE,
      });
    });

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
    const filters = await this.filters(locationId, query);
    if (query.overdue === "true") {
      const { timeZone } = await this.prisma.location.findUniqueOrThrow({
        where: { id: locationId },
        select: { timeZone: true },
      });
      filters.push({
        estimatedReadyDate: { lt: fromCalendarDate(calendarDateIn(new Date(), timeZone)) },
        currentStatus: { code: { notIn: ["READY", ...ENDED_STATUS_CODES] } },
      });
    }
    const where = { AND: [{ locationId }, ...filters] };
    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        orderBy: ticketOrder(query),
        skip: ((query.page ?? 1) - 1) * take,
        take,
        include: LIST_INCLUDE,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { items: tickets.map(listItem), total };
  }

  // Open Tickets are what's physically in the shop, so there are few enough to
  // read whole, which is what lets them sort by urgency (ADR 0088).
  async overview(locationId: string) {
    const { timeZone } = await this.prisma.location.findUniqueOrThrow({
      where: { id: locationId },
      select: { timeZone: true },
    });
    const now = new Date();
    const today = calendarDateIn(now, timeZone);
    const tomorrow = addDays(today, 1);

    const [open, unhandledFeedback] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { locationId, currentStatus: { code: { notIn: [...ENDED_STATUS_CODES] } } },
        include: {
          ...LIST_INCLUDE,
          customer: { select: { ...LIST_INCLUDE.customer.select, emailBouncedAt: true, emailComplainedAt: true } },
          workflow: {
            select: { steps: { orderBy: { position: "asc" }, select: { position: true, status: statusSelect } } },
          },
        },
      }),
      this.prisma.ticketFeedback.count({ where: { ticket: { locationId }, ...NEEDS_FOLLOW_UP } }),
    ]);

    const emailGaveUp = await this.ticketsWhoseEmailGaveUp(open.map((ticket) => ticket.id));
    const dated = open.map((ticket) => ({ ticket, date: toCalendarDate(ticket.estimatedReadyDate) }));
    const isReady = (code: string) => code === "READY";
    const late = dated.filter(
      ({ ticket, date }) => !isReady(ticket.currentStatus.code) && date !== null && date < today,
    );
    const inShop = dated.filter(({ ticket }) => !isReady(ticket.currentStatus.code));

    const rows = dated
      .map(({ ticket, date }) => ({
        ticket,
        date,
        rank: isReady(ticket.currentStatus.code) ? 1 : date !== null && date < today ? 0 : 2,
      }))
      .sort(byUrgency)
      .map(({ ticket }) => ({
        ...listItem(ticket),
        nextStatus: nextStatus(ticket.workflow.steps, ticket.currentStatus.code),
        emailFails:
          emailGaveUp.has(ticket.id) || Boolean(ticket.customer.emailBouncedAt || ticket.customer.emailComplainedAt),
      }));

    return {
      counts: {
        open: open.length,
        ready: open.length - inShop.length,
        late: late.length,
        dueToday: inShop.filter(({ date }) => date === today).length,
        dueTomorrow: inShop.filter(({ date }) => date === tomorrow).length,
        inShop: inShop.length,
        toConfirm: open.filter((ticket) => ticket.customerCollectedAt).length,
        unhandledFeedback,
      },
      tickets: rows.slice(0, OVERVIEW_TICKETS),
      // From every open Ticket: the least urgent can be the one that needs a person.
      needsYou: {
        collected: rows.filter((row) => row.customerCollectedAt),
        failing: rows.filter((row) => row.emailFails),
        longWaits: rows.filter(
          (row) =>
            isReady(row.currentStatus.code) &&
            !row.customerCollectedAt &&
            addDays(calendarDateIn(row.statusSince, timeZone), LONG_WAIT_DAYS) <= today,
        ),
      },
    };
  }

  // Only the few with a failed email are asked about, ticketEmailProblem being
  // one query each.
  private async ticketsWhoseEmailGaveUp(ticketIds: bigint[]) {
    const failed = await this.prisma.emailLog.findMany({
      where: { ticketId: { in: ticketIds }, status: { in: [EmailStatus.FAILED, EmailStatus.BOUNCED] } },
      distinct: ["ticketId"],
      select: { ticketId: true },
    });
    const gaveUp = new Set<bigint>();
    for (const { ticketId } of failed) {
      if ((await this.emailRetry.ticketEmailProblem(ticketId!)) === "GAVE_UP") gaveUp.add(ticketId!);
    }
    return gaveUp;
  }

  private async filters(locationId: string, query: ListTicketsQueryDto): Promise<Prisma.TicketWhereInput[]> {
    const filters: Prisma.TicketWhereInput[] = [];

    if (query.q) {
      // Prisma passes contains through to ILIKE as-is, so a typed % or _
      // would otherwise act as a wildcard instead of a literal character.
      const escape = (text: string) => text.replace(/[\\%_]/g, "\\$&");
      const contains = { contains: escape(query.q), mode: "insensitive" } as const;
      const digits = phoneDigits(query.q);
      filters.push({
        OR: [
          // An erased Customer's Tickets have a placeholder title (ADR 0128).
          { title: contains, customer: { deletedAt: null } },
          { description: contains },
          // Read off a slip, the code comes in groups of four (ADR 0124).
          { trackingCode: { contains: escape(query.q.replace(/\s/g, "")), mode: "insensitive" } },
          // An erased customer's fields are placeholders, not searchable data.
          {
            customer: {
              deletedAt: null,
              OR: [
                { id: { in: await customerIdsNamed(this.prisma, locationId, query.q) } },
                { email: contains },
                { phone: contains },
                ...(digits ? [{ phone: { contains: digits } }] : []),
              ],
            },
          },
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
    if (query.customerCollected === "true") {
      filters.push({ customerCollectedAt: { not: null } });
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

    return filters;
  }

  async findOne(locationId: string, ticketId: string) {
    const id = parseBigIntId(ticketId, "Ticket");
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, locationId },
      include: {
        ...DETAIL_INCLUDE,
        workflow: {
          select: { steps: { orderBy: { position: "asc" }, select: { position: true, status: statusSelect } } },
        },
        statusEvents: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            createdAt: true,
            changedBy: true,
            changer: { select: { name: true } },
            status: statusSelect,
          },
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
        changedByName: event.changer.name,
        status: event.status,
      })),
      photos: await this.photos.forTicket(ticket.id),
      steps: ticket.workflow.steps,
      trackingUrl: trackingUrl(ticket.trackingCode),
      trackingLinkExpired: isTrackingLinkExpired(ticket.currentStatus.code, ticket.statusEvents.at(-1)!.createdAt),
      emailProblem: await this.emailRetry.ticketEmailProblem(ticket.id),
    };
  }

  async update(locationId: string, ticketId: string, dto: UpdateTicketDto) {
    const id = parseBigIntId(ticketId, "Ticket");
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, locationId },
      include: {
        currentStatus: true,
        location: { select: READY_DATE_LOCATION_SELECT },
        customer: { select: { deletedAt: true } },
      },
    });
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }
    // Its words were erased with the Customer, they'd come back with an edit.
    if (ticket.customer.deletedAt && (dto.title !== undefined || dto.description !== undefined)) {
      throw new ConflictError("An erased Customer's Ticket can't be described again");
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.estimatedReadyDate !== undefined && this.readyDateChange(ticket, dto.estimatedReadyDate)),
      },
      include: DETAIL_INCLUDE,
    });

    return this.mapDetail(updated);
  }

  private initialReadyDate(location: ReadyDateLocation, requested: string | null | undefined) {
    if (requested === undefined) {
      return location.turnaroundDays
        ? turnaroundReadyDate({
            droppedOffAt: new Date(),
            turnaroundDays: location.turnaroundDays,
            timeZone: location.timeZone,
            openingHours: location.openingHours as { dayOfWeek: string }[],
          })
        : null;
    }
    if (requested !== null) {
      assertNotPast(requested, location);
    }
    return requested;
  }

  // ADR 0030: moving the date past the last one the Customer was told
  // queues an email, delayed like a status email so a quick correction
  // sends nothing. An earlier date, or a first one, only shows on the
  // tracking page.
  private readyDateChange(
    ticket: {
      estimatedReadyDate: Date | null;
      customerToldReadyDate: Date | null;
      currentStatus: { code: string };
      location: ReadyDateLocation;
    },
    date: string | null,
  ) {
    // A form sending back the date it was given, even one now past, changes nothing.
    if (date === toCalendarDate(ticket.estimatedReadyDate)) {
      return {};
    }
    if (isEndedStatus(ticket.currentStatus.code)) {
      throw new ConflictError("An ended ticket's estimated ready date can't change");
    }
    if (date !== null) {
      assertNotPast(date, ticket.location);
    }
    const told = toCalendarDate(ticket.customerToldReadyDate);
    const later = date !== null && told !== null && date > told;
    return {
      estimatedReadyDate: date && fromCalendarDate(date),
      readyDateEmailDueAt: later ? new Date(Date.now() + STATUS_NOTIFICATION_DELAY_MS) : null,
    };
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
      const event = await tx.ticketStatusEvent.create({
        data: {
          ticketId: ticket.id,
          workflowId: ticket.workflowId,
          statusId: step.statusId,
          changedBy: userId,
          // Sent later by NotificationService, only if still current (ADR 0015).
          // COMPLETED may send the feedback email, decided then (ADR 0039).
          ...((isNotifyingStatus(dto.statusCode) || dto.statusCode === "COMPLETED") && {
            pendingNotification: { create: { sendAfter: new Date(Date.now() + STATUS_NOTIFICATION_DELAY_MS) } },
          }),
        },
      });
      // A new READY starts the reminders over, and a "collected" mark from
      // an earlier one no longer holds (ADR 0028, ADR 0037).
      if (dto.statusCode === "READY") {
        await tx.ticket.update({
          where: { id },
          data: {
            customerCollectedAt: null,
            readyRemindersSent: 0,
            nextReadyReminderAt: nextReadyReminderAt(event.createdAt, 0),
          },
        });
      }
      return tx.ticket.findUniqueOrThrow({ where: { id }, include: DETAIL_INCLUDE });
    });

    return this.mapDetail(updated);
  }

  // "Customer says collected" was wrong, the item is still on the shelf:
  // the reminders not sent yet go out as scheduled (ADR 0028).
  async dismissCustomerCollected(locationId: string, ticketId: string) {
    const id = parseBigIntId(ticketId, "Ticket");
    const ticket = await this.prisma.ticket.findFirst({ where: { id, locationId }, include: { currentStatus: true } });
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }
    // Past READY the time is the record of what the Customer said.
    if (ticket.currentStatus.code !== "READY") {
      throw new ConflictError("Only a READY ticket's collected mark can be dismissed");
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: { customerCollectedAt: null },
      include: DETAIL_INCLUDE,
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
    estimatedReadyDate: Date | null;
    customerCollectedAt: Date | null;
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
      estimatedReadyDate: toCalendarDate(ticket.estimatedReadyDate),
      // "Customer says collected" (ADR 0028).
      customerCollectedAt: ticket.customerCollectedAt,
      createdAt: ticket.createdAt,
      customer: { ...ticket.customer, id: ticket.customer.id.toString() },
      currentStatus: ticket.currentStatus,
    };
  }
}
