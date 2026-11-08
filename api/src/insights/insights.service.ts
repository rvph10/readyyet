import { Injectable } from "@nestjs/common";
import { EmailStatus, InvitationStatus } from "@readyyet/db";
import { calendarDateIn } from "@readyyet/shared";
import { fromCalendarDate, toCalendarDate } from "../common/calendar-date";
import { statusSelect } from "../common/status-select";
import { PrismaService } from "../database/prisma.service";

const MONTHS = 6;
const ACTIVITY = 8;
const DAY_MS = 24 * 60 * 60 * 1000;
const CUSTOMER_EMAILS = [
  "ticket_tracking_link",
  "ticket_status_update",
  "ticket_ready_reminder",
  "ticket_ready_date_changed",
  "ticket_feedback_request",
];

function addDays(date: string, days: number) {
  const moved = fromCalendarDate(date);
  moved.setUTCDate(moved.getUTCDate() + days);
  return toCalendarDate(moved)!;
}

function addMonths(month: string, months: number) {
  const moved = fromCalendarDate(`${month}-01`);
  moved.setUTCMonth(moved.getUTCMonth() + months);
  return toCalendarDate(moved)!.slice(0, 7);
}

@Injectable()
export class InsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(locationId: string, userId: string) {
    const location = await this.prisma.location.findUniqueOrThrow({
      where: { id: locationId },
      include: { business: { select: { logoKey: true } } },
    });
    const { timeZone } = location;
    const now = new Date();
    const today = calendarDateIn(now, timeZone);
    const thisMonth = today.slice(0, 7);
    const firstMonth = addMonths(thisMonth, -(MONTHS - 1));
    const dayOf = (instant: Date) => calendarDateIn(instant, timeZone);
    // A day early, as the Location's clock can be behind UTC, then each row is
    // placed on that clock.
    const since = (date: string) => ({ gte: fromCalendarDate(addDays(date, -1)) });
    const monthStart = `${thisMonth}-01`;

    const [received, readyEvents, emails, notes, activity, members, invited, anyTicket, anyHandover, mine] =
      await Promise.all([
        this.prisma.ticket.findMany({
          where: { locationId, createdAt: since(`${firstMonth}-01`) },
          select: { createdAt: true, customerId: true, createdBy: true },
        }),
        this.prisma.ticketStatusEvent.findMany({
          where: { ticket: { locationId }, status: { code: "READY" }, createdAt: since(monthStart) },
          orderBy: { createdAt: "asc" },
          select: {
            ticketId: true,
            createdAt: true,
            ticket: { select: { createdAt: true, estimatedReadyDate: true } },
          },
        }),
        this.prisma.emailLog.findMany({
          where: {
            ticket: { locationId },
            type: { in: CUSTOMER_EMAILS },
            status: { in: [EmailStatus.SENT, EmailStatus.DELIVERED] },
            createdAt: since(monthStart),
          },
          select: { type: true, createdAt: true },
        }),
        this.prisma.ticketFeedback.findMany({
          where: { ticket: { locationId }, createdAt: since(monthStart) },
          select: { createdAt: true },
        }),
        this.prisma.ticketStatusEvent.findMany({
          where: { ticket: { locationId } },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: ACTIVITY,
          select: {
            id: true,
            createdAt: true,
            changedBy: true,
            changer: { select: { name: true } },
            status: statusSelect,
            ticket: { select: { id: true, title: true, customer: { select: { fullName: true } } } },
          },
        }),
        this.prisma.membership.count({ where: { locationId } }),
        this.prisma.invitation.count({ where: { locationId, status: InvitationStatus.PENDING } }),
        this.prisma.ticket.findFirst({ where: { locationId }, select: { id: true } }),
        this.prisma.ticketStatusEvent.findFirst({
          where: { ticket: { locationId }, status: { code: "COMPLETED" } },
          select: { id: true },
        }),
        this.prisma.ticketStatusEvent.findMany({
          where: { ticket: { locationId }, changedBy: userId, createdAt: { gte: new Date(now.getTime() - 2 * DAY_MS) } },
          select: { createdAt: true },
        }),
      ]);

    const byMonth = new Map<string, number>();
    for (const { createdAt } of received) {
      const month = dayOf(createdAt).slice(0, 7);
      byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
    }
    const lastMonth = addMonths(thisMonth, -1);
    const sameDayLastMonth = `${lastMonth}-${today.slice(8)}`;
    const lastMonthSoFar = received.filter(({ createdAt }) => {
      const day = dayOf(createdAt);
      return day.startsWith(lastMonth) && day <= sameDayLastMonth;
    }).length;

    const thisMonthTickets = received.filter(({ createdAt }) => dayOf(createdAt) >= monthStart);
    const customerIds = [...new Set(thisMonthTickets.map(({ customerId }) => customerId))];
    const firstTickets = await this.prisma.ticket.groupBy({
      by: ["customerId"],
      where: { locationId, customerId: { in: customerIds } },
      _min: { createdAt: true },
    });
    const returning = firstTickets.filter(({ _min }) => dayOf(_min.createdAt!) < monthStart).length;

    // A Ticket moved back and readied again counts once, at its first READY this month.
    const readied = new Map<bigint, (typeof readyEvents)[number]>();
    for (const event of readyEvents) {
      if (dayOf(event.createdAt) >= monthStart && !readied.has(event.ticketId)) readied.set(event.ticketId, event);
    }
    const readiedEvents = [...readied.values()];
    const dated = readiedEvents.filter(({ ticket }) => ticket.estimatedReadyDate);
    const totalDays = readiedEvents.reduce(
      (sum, { createdAt, ticket }) => sum + (createdAt.getTime() - ticket.createdAt.getTime()) / DAY_MS,
      0,
    );

    const monthEmails = emails.filter(({ createdAt }) => dayOf(createdAt) >= monthStart);
    const createdToday = received.filter(
      ({ createdAt, createdBy }) => createdBy === userId && dayOf(createdAt) === today,
    ).length;
    const changesToday = mine.filter(({ createdAt }) => dayOf(createdAt) === today).length;

    return {
      setup: {
        address: Boolean(location.streetAddress),
        openingHours: Array.isArray(location.openingHours) && location.openingHours.length > 0,
        turnaround: location.turnaroundDays !== null,
        reviewLink: Boolean(location.googleReviewUrl),
        logo: Boolean(location.business.logoKey),
        team: members > 1 || invited > 0,
        firstTicket: anyTicket !== null,
        firstHandover: anyHandover !== null,
      },
      received: {
        months: Array.from({ length: MONTHS }, (_, index) => {
          const month = addMonths(firstMonth, index);
          return { month, received: byMonth.get(month) ?? 0 };
        }),
        lastMonthSoFar,
      },
      customers: { new: customerIds.length - returning, returning },
      promise: {
        readied: readiedEvents.length,
        dated: dated.length,
        onTime: dated.filter(({ createdAt, ticket }) => dayOf(createdAt) <= toCalendarDate(ticket.estimatedReadyDate)!)
          .length,
        averageDays: readiedEvents.length ? Math.round((totalDays / readiedEvents.length) * 10) / 10 : null,
        turnaroundDays: location.turnaroundDays,
      },
      updates: {
        delivered: monthEmails.length,
        reminders: monthEmails.filter(({ type }) => type === "ticket_ready_reminder").length,
        reviewRequests: monthEmails.filter(({ type }) => type === "ticket_feedback_request").length,
        notes: notes.filter(({ createdAt }) => dayOf(createdAt) >= monthStart).length,
      },
      activity: activity.map((event) => ({
        id: event.id.toString(),
        ticketId: event.ticket.id.toString(),
        ticketTitle: event.ticket.title,
        customerName: event.ticket.customer.fullName,
        status: event.status,
        changedBy: event.changedBy,
        changedByName: event.changer.name,
        createdAt: event.createdAt,
      })),
      // Creating a Ticket also records its first Status, which isn't a move.
      yourDay: { created: createdToday, moved: changesToday - createdToday },
    };
  }
}
