import { Injectable, Logger } from "@nestjs/common";
import { Prisma, Role } from "@readyyet/db";
import { calendarDateIn, FEEDBACK_TAGS, type FeedbackTag } from "@readyyet/shared";
import { fromCalendarDate } from "../common/calendar-date";
import { parseBigIntId } from "../common/parse-bigint-id";
import { ConflictError, NotFoundError } from "../common/errors/app-error";
import { PrismaService } from "../database/prisma.service";
import { EmailService } from "../email/email.service";
import { NotificationService } from "../notification/notification.service";
import { buildFeedbackReceivedEmail } from "../notification/staff-email/staff-email";
import { NEEDS_FOLLOW_UP, needsFollowUp } from "./asks-for-feedback";
import { ListFeedbackQueryDto } from "./dto/list-feedback.query.dto";

const DEFAULT_LIST_TAKE = 20;

const FEEDBACK_INCLUDE = {
  ticket: {
    select: { id: true, title: true, customer: { select: { id: true, fullName: true, email: true, phone: true } } },
  },
  handler: { select: { id: true, name: true } },
} as const;

type LoadedFeedback = Prisma.TicketFeedbackGetPayload<{ include: typeof FEEDBACK_INCLUDE }>;

interface Answer {
  stars: number;
  tags: FeedbackTag[];
  message?: string;
}

// A Customer's answer on the review page and what the shop does with it
// (ADR 0027, ADR 0039, ADR 0125).
@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly notifications: NotificationService,
  ) {}

  // The caller checked the Ticket takes feedback. Stars and tags can change
  // until a message is sent, which closes the answer; a tap on Google still
  // counts after that.
  async answer(ticketId: bigint, { stars, tags, message }: Answer, { google = false } = {}) {
    const existing = await this.prisma.ticketFeedback.findUnique({ where: { ticketId } });
    const now = new Date();

    if (existing?.message != null) {
      if (!google) {
        throw new ConflictError("Feedback was already sent for this ticket");
      }
      await this.prisma.ticketFeedback.updateMany({
        where: { id: existing.id, googleClickedAt: null },
        data: { googleClickedAt: now },
      });
      return;
    }

    const data = {
      stars,
      tags,
      ...(message !== undefined && { message }),
      ...(google && { googleClickedAt: existing?.googleClickedAt ?? now }),
    };
    if (existing) {
      // Conditional, so a message sent meanwhile from another tab isn't overwritten.
      const { count } = await this.prisma.ticketFeedback.updateMany({
        where: { id: existing.id, message: null },
        data,
      });
      if (count === 0) {
        throw new ConflictError("Feedback was already sent for this ticket");
      }
    } else {
      // A second create for the same Ticket fails on the unique ticket_id, a 409.
      await this.prisma.ticketFeedback.create({ data: { ticketId, ...data } });
    }

    const handledAt = existing?.handledAt ?? null;
    const before = existing !== null && needsFollowUp(existing);
    if (!before && needsFollowUp({ handledAt, message: message ?? null, stars })) {
      // Not awaited: the Customer's page shouldn't wait on the rate limit or
      // retries of one send per Owner and Admin. A failed send is recorded
      // and retried by EmailService, like an invitation's.
      this.notifyStaff(ticketId, stars, message ?? null).catch((err) => {
        this.logger.error(
          `Failed to email feedback on ticket ${ticketId} to staff`,
          err instanceof Error ? err.stack : err,
        );
      });
    }
  }

  // Every Owner and Admin, each in their own language.
  private async notifyStaff(ticketId: bigint, stars: number, message: string | null) {
    const { title, customer, location } = await this.prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      select: { title: true, customer: { select: { fullName: true } }, location: { select: { id: true, name: true } } },
    });
    const staff = await this.prisma.membership.findMany({
      where: { locationId: location.id, role: { in: [Role.OWNER, Role.ADMIN] } },
      select: { user: { select: { email: true, locale: true } } },
    });
    for (const { user } of staff) {
      const email = buildFeedbackReceivedEmail({
        locale: user.locale,
        location: location.name,
        customer: customer.fullName,
        title,
        stars,
        message,
        feedbackUrl: `${process.env.WEB_URL}/locations/${location.id}/feedback`,
      });
      await this.email.send({ to: user.email, ...email, type: "feedback_received", ticketId });
    }
  }

  async list(locationId: string, query: ListFeedbackQueryDto) {
    const take = query.take ?? DEFAULT_LIST_TAKE;
    const where = { ticket: { locationId }, ...(query.view === "follow-up" && NEEDS_FOLLOW_UP) };
    const [rows, total] = await Promise.all([
      this.prisma.ticketFeedback.findMany({
        where,
        include: FEEDBACK_INCLUDE,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: ((query.page ?? 1) - 1) * take,
        take,
      }),
      this.prisma.ticketFeedback.count({ where }),
    ]);

    return { items: rows.map(toResponse), total };
  }

  // Closed without a reply, for a Customer who was called or who has no
  // email address. Repeating it keeps who handled it first.
  async markHandled(locationId: string, feedbackId: string, userId: string) {
    const id = parseBigIntId(feedbackId, "Feedback");
    await this.prisma.ticketFeedback.updateMany({
      where: { id, ticket: { locationId }, handledAt: null },
      data: { handledAt: new Date(), handledBy: userId },
    });
    return this.findOne(locationId, id);
  }

  // ADR 0125: emailed to the Customer in the shop's name, then stored. One
  // reply per answer, further talk goes on by email.
  async reply(locationId: string, feedbackId: string, userId: string, reply: string) {
    const id = parseBigIntId(feedbackId, "Feedback");
    const feedback = await this.findOne(locationId, id);
    const now = new Date();
    // Claimed before sending, so two clicks can't email the Customer twice.
    const { count } = await this.prisma.ticketFeedback.updateMany({
      where: { id, reply: null },
      data: {
        reply,
        repliedAt: now,
        handledAt: feedback.handledAt ?? now,
        handledBy: feedback.handledBy?.id ?? userId,
      },
    });
    if (count === 0) {
      throw new ConflictError("This feedback already has a reply");
    }
    try {
      await this.notifications.sendFeedbackReply(BigInt(feedback.ticket.id), reply);
    } catch (err) {
      await this.prisma.ticketFeedback.update({
        where: { id },
        data: {
          reply: null,
          repliedAt: null,
          handledAt: feedback.handledAt,
          handledBy: feedback.handledBy?.id ?? null,
        },
      });
      throw err;
    }
    return this.findOne(locationId, id);
  }

  // This month on the Location's clock, and every rating ever for the average
  // a shop page can show one day.
  async insights(locationId: string) {
    const { timeZone } = await this.prisma.location.findUniqueOrThrow({
      where: { id: locationId },
      select: { timeZone: true },
    });
    const month = calendarDateIn(new Date(), timeZone).slice(0, 7);
    const inMonth = (instant: Date | null) => instant !== null && calendarDateIn(instant, timeZone).startsWith(month);
    // A day early, as the Location's clock can be behind UTC, then each row is
    // placed on that clock.
    const since = new Date(fromCalendarDate(`${month}-01`).getTime() - 24 * 60 * 60 * 1000);

    const [asked, rows, allTime] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { locationId, feedbackEmailSentAt: { gte: since } },
        select: { feedbackEmailSentAt: true },
      }),
      this.prisma.ticketFeedback.findMany({
        where: { ticket: { locationId }, OR: [{ createdAt: { gte: since } }, { googleClickedAt: { gte: since } }] },
        select: { createdAt: true, stars: true, tags: true, message: true, googleClickedAt: true },
      }),
      this.prisma.ticketFeedback.aggregate({
        where: { ticket: { locationId }, stars: { not: null } },
        _avg: { stars: true },
        _count: { stars: true },
      }),
    ]);

    const answers = rows.filter(({ createdAt }) => inMonth(createdAt));
    const rated = answers.filter((row): row is typeof row & { stars: number } => row.stars !== null);
    const stars = [1, 2, 3, 4, 5].map((value) => rated.filter((row) => row.stars === value).length);
    const tags = FEEDBACK_TAGS.map((tag) => ({ tag, count: answers.filter((row) => row.tags.includes(tag)).length }))
      .filter(({ count }) => count > 0)
      .sort((a, b) => b.count - a.count);

    return {
      month,
      asked: asked.filter(({ feedbackEmailSentAt }) => inMonth(feedbackEmailSentAt)).length,
      answers: answers.length,
      ratings: rated.length,
      average: rated.length ? rated.reduce((sum, row) => sum + row.stars, 0) / rated.length : null,
      stars,
      tags,
      google: rows.filter(({ googleClickedAt }) => inMonth(googleClickedAt)).length,
      messages: answers.filter(({ message }) => message !== null).length,
      allTime: { ratings: allTime._count.stars, average: allTime._avg.stars },
    };
  }

  private async findOne(locationId: string, id: bigint) {
    const feedback = await this.prisma.ticketFeedback.findFirst({
      where: { id, ticket: { locationId } },
      include: FEEDBACK_INCLUDE,
    });
    if (!feedback) {
      throw new NotFoundError("Feedback not found");
    }
    return toResponse(feedback);
  }
}

function toResponse({ ticket, handler, ...feedback }: LoadedFeedback) {
  return {
    id: feedback.id.toString(),
    stars: feedback.stars,
    tags: feedback.tags as FeedbackTag[],
    message: feedback.message,
    googleClickedAt: feedback.googleClickedAt,
    reply: feedback.reply,
    repliedAt: feedback.repliedAt,
    needsFollowUp: needsFollowUp(feedback),
    ticket: { id: ticket.id.toString(), title: ticket.title },
    customer: {
      id: ticket.customer.id.toString(),
      fullName: ticket.customer.fullName,
      email: ticket.customer.email,
      phone: ticket.customer.phone,
    },
    handledAt: feedback.handledAt,
    handledBy: handler,
    createdAt: feedback.createdAt,
  };
}
