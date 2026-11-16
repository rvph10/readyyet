import { Injectable } from "@nestjs/common";
import { Prisma, SubscriptionStatus } from "@readyyet/db";
import { calendarDateIn } from "@readyyet/shared";
import { isFrozen } from "../billing/plans";
import { addDays, fromCalendarDate } from "../common/calendar-date";
import { PrismaService } from "../database/prisma.service";
import { AdminOverviewDto, OverviewSeriesDto } from "./dto/overview.dto";
import { platformAdminEmails } from "./platform-admin";

const WEEKS = 12;
const LATEST_SIGNUPS = 10;
// ReadyYet is run from Belgium, so a week starts on a Brussels Monday.
const TIME_ZONE = "Europe/Brussels";

function mondayOf(date: string) {
  return addDays(date, -((fromCalendarDate(date).getUTCDay() + 6) % 7));
}

@Injectable()
export class OverviewService {
  constructor(private readonly prisma: PrismaService) {}

  // ADR 0161: how ReadyYet grows, week by week. The platform admin's own
  // accounts, and the Businesses they own, are test data and count nowhere.
  async get(): Promise<AdminOverviewDto> {
    const now = new Date();
    const today = calendarDateIn(now, TIME_ZONE);
    const firstWeek = addDays(mondayOf(today), -7 * (WEEKS - 1));
    const admins = platformAdminEmails();

    // Counted in the database: Tickets run to the tens of thousands.
    const notAdmin = (owner: Prisma.Sql) => Prisma.sql`lower(${owner}.email) <> ALL(${admins}::text[])`;
    const users = Prisma.sql`FROM "user" x WHERE x.deleted_at IS NULL AND ${notAdmin(Prisma.sql`x`)}`;
    const locations = Prisma.sql`FROM location x
      JOIN business b ON b.id = x.business_id
      JOIN "user" o ON o.id = b.owner_id
      WHERE x.deleted_at IS NULL AND ${notAdmin(Prisma.sql`o`)}`;
    const tickets = Prisma.sql`FROM ticket x
      JOIN location l ON l.id = x.location_id
      JOIN business b ON b.id = l.business_id
      JOIN "user" o ON o.id = b.owner_id
      WHERE ${notAdmin(Prisma.sql`o`)}`;

    const series = async (rows: Prisma.Sql): Promise<OverviewSeriesDto> => {
      const [[{ total }], days] = await Promise.all([
        this.prisma.$queryRaw<{ total: number }[]>`SELECT count(*)::int AS total ${rows}`,
        // created_at holds UTC without a zone.
        this.prisma.$queryRaw<{ day: string; count: number }[]>`
          SELECT (x.created_at AT TIME ZONE 'UTC' AT TIME ZONE ${TIME_ZONE})::date::text AS day, count(*)::int AS count
          ${rows} AND x.created_at >= ${fromCalendarDate(addDays(firstWeek, -1))}
          GROUP BY 1`,
      ]);
      const byWeek = new Map<string, number>();
      for (const { day, count } of days) {
        const week = mondayOf(day);
        byWeek.set(week, (byWeek.get(week) ?? 0) + count);
      }
      const lastWeek = addDays(mondayOf(today), -7);
      const sameDayLastWeek = addDays(today, -7);
      return {
        total,
        weeks: Array.from({ length: WEEKS }, (_, index) => {
          const week = addDays(firstWeek, 7 * index);
          return { week, count: byWeek.get(week) ?? 0 };
        }),
        lastWeekSoFar: days
          .filter(({ day }) => day >= lastWeek && day <= sameDayLastWeek)
          .reduce((sum, { count }) => sum + count, 0),
      };
    };

    const [userSeries, locationSeries, ticketSeries, subscriptions, latest] = await Promise.all([
      series(users),
      series(locations),
      series(tickets),
      this.prisma.$queryRaw<{ status: SubscriptionStatus; trialEndsAt: Date | null }[]>`
        SELECT s.status, s.trial_ends_at AS "trialEndsAt" FROM subscription s
        JOIN location x ON x.id = s.location_id
        JOIN business b ON b.id = x.business_id
        JOIN "user" o ON o.id = b.owner_id
        WHERE x.deleted_at IS NULL AND ${notAdmin(Prisma.sql`o`)}`,
      this.prisma.user.findMany({
        where: {
          deletedAt: null,
          NOT: { OR: admins.map((email) => ({ email: { equals: email, mode: "insensitive" as const } })) },
        },
        orderBy: { createdAt: "desc" },
        take: LATEST_SIGNUPS,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          ownedBusinesses: {
            orderBy: { createdAt: "asc" },
            select: {
              name: true,
              locations: { where: { deletedAt: null }, select: { _count: { select: { tickets: true } } } },
            },
          },
        },
      }),
    ]);

    const states = { trial: 0, paying: 0, pastDue: 0, inactive: 0 };
    for (const subscription of subscriptions) {
      if (subscription.status === SubscriptionStatus.PAST_DUE) states.pastDue++;
      else if (subscription.status === SubscriptionStatus.ACTIVE) states.paying++;
      else if (isFrozen(subscription, now)) states.inactive++;
      else states.trial++;
    }

    return {
      users: userSeries,
      locations: { ...locationSeries, ...states },
      tickets: ticketSeries,
      latestSignups: latest.map(({ ownedBusinesses, ...signup }) => {
        const shops = ownedBusinesses.flatMap((business) => business.locations);
        return {
          ...signup,
          businessName: ownedBusinesses[0]?.name ?? null,
          locations: shops.length,
          tickets: shops.reduce((sum, { _count }) => sum + _count.tickets, 0),
        };
      }),
    };
  }
}
