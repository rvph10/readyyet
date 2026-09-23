import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { isNotifyingStatus } from "@readyyet/shared";
import { ConflictError } from "../common/errors/app-error";
import { PrismaService } from "../database/prisma.service";
import { EmailService } from "../email/email.service";
import { isTrackingLinkExpired, oneClickStopUrl, stopUpdatesUrl, trackingUrl } from "../tracking/tracking-link";
import { buildCustomerEmail } from "./customer-email/customer-email";
import type { CustomerEmailKind } from "./customer-email/messages";

// How long a sweep holds a due email it's sending before another sweep
// may retry it, far longer than a send takes, retries included.
const CLAIM_LEASE_MS = 5 * 60 * 1000;

type LoadedTicket = Awaited<ReturnType<NotificationService["loadTicket"]>>;

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
      await this.sendCustomerEmail(ticket, ticket.customer.email, "TICKET_CREATED", "ticket_tracking_link");
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
    await this.sendCustomerEmail(ticket, ticket.customer.email, "TICKET_CREATED", "ticket_tracking_link");
    return { sentTo: ticket.customer.email };
  }

  // Status emails queued by TicketService.updateStatus become due once
  // their undo window has passed. An undone change deleted its row with
  // its status event, so everything here was really made.
  @Cron(CronExpression.EVERY_30_SECONDS, { name: "customer-status-emails" })
  async sendDueStatusEmails() {
    const due = await this.prisma.pendingStatusNotification.findMany({
      where: { sendAfter: { lte: new Date() } },
      orderBy: { sendAfter: "asc" },
      include: { statusEvent: { include: { status: true } } },
    });

    for (const { statusEvent, sendAfter } of due) {
      // Claimed by pushing sendAfter out, conditional on the value just
      // read: a concurrent sweep (an overlapping run, another instance)
      // claims nothing and skips it. If this process dies mid-send, the
      // lease simply expires and the email is retried, never dropped.
      const { count } = await this.prisma.pendingStatusNotification.updateMany({
        where: { statusEventId: statusEvent.id, sendAfter },
        data: { sendAfter: new Date(Date.now() + CLAIM_LEASE_MS) },
      });
      if (count === 0) {
        continue;
      }
      await this.sendStatusEmail(statusEvent);
      await this.prisma.pendingStatusNotification.deleteMany({ where: { statusEventId: statusEvent.id } });
    }
  }

  private async sendStatusEmail(event: { id: bigint; ticketId: bigint; status: { code: string } }) {
    const ticket = await this.loadTicket(event.ticketId);
    // A later change superseded this one, the customer only hears about
    // where the ticket stands now (that change queued its own email if
    // it needs one).
    const stillCurrent = ticket.statusEvents[0].id === event.id;
    if (
      !stillCurrent ||
      ticket.notificationsStoppedAt ||
      !ticket.customer.email ||
      ticket.location.deletedAt ||
      !isNotifyingStatus(event.status.code)
    ) {
      return;
    }
    await this.sendCustomerEmail(ticket, ticket.customer.email, event.status.code, "ticket_status_update");
  }

  private loadTicket(ticketId: bigint) {
    return this.prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      include: {
        customer: true,
        currentStatus: true,
        location: { include: { businessType: true } },
        // The latest event only: when the ticket reached its current status.
        statusEvents: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1 },
      },
    });
  }

  private async sendCustomerEmail(ticket: LoadedTicket, to: string, kind: CustomerEmailKind, type: string) {
    const { subject, react } = buildCustomerEmail({
      kind,
      locale: ticket.customer.locale ?? ticket.location.locale,
      businessTypeCode: ticket.location.businessType.code,
      customerName: ticket.customer.fullName,
      ticketTitle: ticket.title,
      location: ticket.location,
      trackingUrl: trackingUrl(ticket.trackingCode),
      stopUpdatesUrl: stopUpdatesUrl(ticket.trackingCode),
    });
    await this.email.send({
      to,
      subject,
      react,
      type,
      fromName: `${ticket.location.name} via ReadyYet`,
      replyTo: ticket.location.contactEmail,
      // Lets mail clients show their own unsubscribe button, which then
      // stops this ticket's updates instead of marking us as spam.
      headers: {
        "List-Unsubscribe": `<${oneClickStopUrl(ticket.trackingCode)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
  }
}
