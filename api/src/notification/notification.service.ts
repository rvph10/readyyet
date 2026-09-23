import { Injectable } from "@nestjs/common";
import { ConflictError } from "../common/errors/app-error";
import { PrismaService } from "../database/prisma.service";
import { EmailService } from "../email/email.service";
import { isTrackingLinkExpired, stopUpdatesUrl, trackingUrl } from "../tracking/tracking-link";
import { buildCustomerEmail, type CustomerEmailInput } from "./customer-email/customer-email";

// Customer emails, see docs/decisions/0015-customer-emails.md.
@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // Sent when a ticket is created, a Customer without an email address
  // gets nothing (they have the QR code instead, ADR 0004).
  async sendTicketCreated(ticketId: bigint) {
    const ticket = await this.loadTicket(ticketId);
    if (ticket.customer.email) {
      await this.sendTrackingLink(ticket, ticket.customer.email);
    }
  }

  // Staff's explicit "resend tracking link", allowed even after the
  // Customer stopped status updates (ADR 0015).
  async resendTrackingLink(ticketId: bigint) {
    const ticket = await this.loadTicket(ticketId);
    if (!ticket.customer.email) {
      throw new ConflictError("This customer has no email address");
    }
    if (isTrackingLinkExpired(ticket.currentStatus.code, ticket.statusEvents[0].createdAt)) {
      throw new ConflictError("This ticket's tracking link has expired");
    }
    await this.sendTrackingLink(ticket, ticket.customer.email);
    return { sentTo: ticket.customer.email };
  }

  private loadTicket(ticketId: bigint) {
    return this.prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      include: {
        customer: true,
        currentStatus: true,
        location: { include: { businessType: true } },
        statusEvents: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1 },
      },
    });
  }

  private async sendTrackingLink(ticket: Awaited<ReturnType<NotificationService["loadTicket"]>>, to: string) {
    await this.sendCustomerEmail("ticket_tracking_link", to, ticket.location.contactEmail, {
      kind: "TICKET_CREATED",
      locale: ticket.customer.locale ?? ticket.location.locale,
      businessTypeCode: ticket.location.businessType.code,
      customerName: ticket.customer.fullName,
      ticketTitle: ticket.title,
      location: ticket.location,
      trackingUrl: trackingUrl(ticket.trackingCode),
      stopUpdatesUrl: stopUpdatesUrl(ticket.trackingCode),
    });
  }

  private async sendCustomerEmail(type: string, to: string, replyTo: string, input: CustomerEmailInput) {
    const { subject, react } = buildCustomerEmail(input);
    await this.email.send({ to, subject, react, type, fromName: `${input.location.name} via ReadyYet`, replyTo });
  }
}
