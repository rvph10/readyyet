import { Injectable } from "@nestjs/common";
import { Prisma, Role } from "@readyyet/db";
import { isBigIntId, parseBigIntId } from "../common/parse-bigint-id";
import { NotFoundError, ValidationError } from "../common/errors/app-error";
import { PrismaService } from "../database/prisma.service";
import { EmailService } from "../email/email.service";
import { buildFeedbackReceivedEmail } from "../notification/staff-email/staff-email";
import { ListFeedbackQueryDto } from "./dto/list-feedback.query.dto";

const DEFAULT_LIST_TAKE = 20;

const FEEDBACK_INCLUDE = {
  ticket: { select: { id: true, title: true, customer: { select: { id: true, fullName: true } } } },
  handler: { select: { id: true, name: true } },
} as const;

type LoadedFeedback = Prisma.TicketFeedbackGetPayload<{ include: typeof FEEDBACK_INCLUDE }>;

// Private feedback from the tracking page (ADR 0027, ADR 0039).
@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // The caller checked the Ticket may take it. A second one for the same
  // Ticket fails on the unique ticket_id with a 409.
  async create(ticketId: bigint, message: string) {
    const feedback = await this.prisma.ticketFeedback.create({
      data: { ticketId, message },
      include: { ticket: { include: { customer: true, location: true } } },
    });
    const { location, customer, title } = feedback.ticket;

    // After the commit: every Owner and Admin, each in their own language.
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
        message,
        feedbackUrl: `${process.env.WEB_URL}/locations/${location.id}/feedback`,
      });
      await this.email.send({ to: user.email, ...email, type: "feedback_received" });
    }
  }

  // Newest first, keyset on (createdAt, id) like Tickets. The cursor is
  // the last item's id, its date is looked up here.
  async list(locationId: string, query: ListFeedbackQueryDto) {
    const take = query.take ?? DEFAULT_LIST_TAKE;
    const after = query.cursor ? await this.cursorPosition(locationId, query.cursor) : undefined;
    const rows = await this.prisma.ticketFeedback.findMany({
      where: {
        ticket: { locationId },
        ...(query.handled && { handledAt: query.handled === "true" ? { not: null } : null }),
        ...(after && {
          OR: [{ createdAt: { lt: after.createdAt } }, { createdAt: after.createdAt, id: { lt: after.id } }],
        }),
      },
      include: FEEDBACK_INCLUDE,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      // One extra row says whether there's a next page.
      take: take + 1,
    });

    const page = rows.slice(0, take);
    return {
      items: page.map(toResponse),
      nextCursor: rows.length > take ? page[page.length - 1].id.toString() : null,
    };
  }

  // Repeating it keeps who handled it first.
  async markHandled(locationId: string, feedbackId: string, userId: string) {
    const id = parseBigIntId(feedbackId, "Feedback");
    await this.prisma.ticketFeedback.updateMany({
      where: { id, ticket: { locationId }, handledAt: null },
      data: { handledAt: new Date(), handledBy: userId },
    });
    const feedback = await this.prisma.ticketFeedback.findFirst({
      where: { id, ticket: { locationId } },
      include: FEEDBACK_INCLUDE,
    });
    if (!feedback) {
      throw new NotFoundError("Feedback not found");
    }
    return toResponse(feedback);
  }

  private async cursorPosition(locationId: string, cursor: string) {
    const feedback = isBigIntId(cursor)
      ? await this.prisma.ticketFeedback.findFirst({
          where: { id: BigInt(cursor), ticket: { locationId } },
          select: { id: true, createdAt: true },
        })
      : null;
    if (!feedback) {
      throw new ValidationError("Invalid cursor");
    }
    return feedback;
  }
}

function toResponse({ ticket, handler, ...feedback }: LoadedFeedback) {
  return {
    id: feedback.id.toString(),
    message: feedback.message,
    ticket: { id: ticket.id.toString(), title: ticket.title },
    customer: { id: ticket.customer.id.toString(), fullName: ticket.customer.fullName },
    handledAt: feedback.handledAt,
    handledBy: handler,
    createdAt: feedback.createdAt,
  };
}
