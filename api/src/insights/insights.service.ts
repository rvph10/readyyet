import { Injectable } from "@nestjs/common";
import { InvitationStatus } from "@readyyet/db";
import { calendarDateIn, SYSTEM_STATUS_CODES } from "@readyyet/shared";
import { fromCalendarDate, toCalendarDate } from "../common/calendar-date";
import { statusSelect } from "../common/status-select";
import { NotFoundError } from "../common/errors/app-error";
import { PrismaService } from "../database/prisma.service";
import { publicImageUrl } from "../storage/image";

const MONTHS = 6;
const ACTIVITY = 8;
const [CREATED_STATUS_CODE] = SYSTEM_STATUS_CODES;

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

  async get(locationId: string) {
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

    const [received, activity, members, invited, anyTicket, anyHandover] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { locationId, createdAt: since(`${firstMonth}-01`) },
        select: { createdAt: true, customerId: true },
      }),
      this.prisma.ticketStatusEvent.findMany({
        where: { ticket: { locationId } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: ACTIVITY,
        select: {
          id: true,
          createdAt: true,
          changedBy: true,
          changer: { select: { name: true, image: true } },
          status: statusSelect,
          ticket: { select: { id: true, title: true, customer: { select: { fullName: true } } } },
        },
      }),
      this.prisma.membership.count({ where: { locationId } }),
      // Still PENDING past its date until someone opens it, so the date decides.
      this.prisma.invitation.count({
        where: { locationId, status: InvitationStatus.PENDING, expiresAt: { gt: now } },
      }),
      this.prisma.ticket.findFirst({ where: { locationId }, select: { id: true } }),
      this.prisma.ticketStatusEvent.findFirst({
        where: { ticket: { locationId }, status: { code: "COMPLETED" } },
        select: { id: true },
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
      activity: activity.map((event) => ({
        id: event.id.toString(),
        ticketId: event.ticket.id.toString(),
        ticketTitle: event.ticket.title,
        customerName: event.ticket.customer.fullName,
        status: event.status,
        changedBy: event.changedBy,
        changedByName: event.changer.name,
        changedByAvatarUrl: publicImageUrl(event.changer.image),
        createdAt: event.createdAt,
      })),
    };
  }

  // ADR 0142: shown to the whole team, so only what's done here, and only for a
  // current member.
  async member(locationId: string, userId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_locationId: { userId, locationId } },
      include: { user: { select: { name: true, image: true } }, location: { select: { timeZone: true } } },
    });
    if (!membership) {
      throw new NotFoundError("Member not found");
    }
    const [created, events] = await Promise.all([
      this.prisma.ticket.findMany({ where: { locationId, createdBy: userId }, select: { createdAt: true } }),
      this.prisma.ticketStatusEvent.findMany({
        where: { changedBy: userId, ticket: { locationId } },
        select: { createdAt: true, status: { select: { code: true } } },
      }),
    ]);
    const { timeZone } = membership.location;
    const monthStart = `${calendarDateIn(new Date(), timeZone).slice(0, 7)}-01`;
    const counts = (keep: (instant: Date) => boolean) => {
      const moves = events.filter((event) => event.status.code !== CREATED_STATUS_CODE && keep(event.createdAt));
      return {
        created: created.filter((ticket) => keep(ticket.createdAt)).length,
        moved: moves.length,
        ready: moves.filter((event) => event.status.code === "READY").length,
        completed: moves.filter((event) => event.status.code === "COMPLETED").length,
      };
    };
    return {
      userId,
      name: membership.user.name,
      avatarUrl: publicImageUrl(membership.user.image),
      role: membership.role,
      memberSince: membership.createdAt,
      month: counts((instant) => calendarDateIn(instant, timeZone) >= monthStart),
      total: counts(() => true),
    };
  }
}
