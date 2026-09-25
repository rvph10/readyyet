import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { isNotifyingStatus, showsEstimatedReadyDate } from "@readyyet/shared";
import { toCalendarDate } from "../common/calendar-date";
import { CronMonitor } from "../common/decorators/cron-monitor.decorator";
import { ConflictError } from "../common/errors/app-error";
import { PrismaService } from "../database/prisma.service";
import { EmailService } from "../email/email.service";
import { asksForFeedback } from "../feedback/asks-for-feedback";
import { toPostalAddress } from "../location/location-info";
import { publicImageUrl } from "../storage/image";
import {
  collectedUrl,
  isTrackingLinkExpired,
  oneClickStopUrl,
  stopUpdatesUrl,
  trackingUrl,
} from "../tracking/tracking-link";
import { buildCustomerEmail } from "./customer-email/customer-email";
import type { CustomerEmailKind } from "./customer-email/messages";
import { isReminderHour, nextReadyReminderAt } from "./ready-reminders";

// How long a sweep holds a due email it's sending before another sweep
// may retry it, far longer than a send takes, retries included.
const CLAIM_LEASE_MS = 5 * 60 * 1000;

type LoadedTicket = Awaited<ReturnType<NotificationService["loadTicket"]>>;

// An address that bounced for good or reported us as spam gets nothing
// more until staff change it (see the Customer schema).
function canEmail<C extends { email: string | null; emailBouncedAt: Date | null; emailComplainedAt: Date | null }>(
  customer: C,
): customer is C & { email: string } {
  return customer.email !== null && !customer.emailBouncedAt && !customer.emailComplainedAt;
}

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
    if (canEmail(ticket.customer)) {
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
    if (!canEmail(ticket.customer)) {
      throw new ConflictError("Emails to this customer's address fail, check it with them first");
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
  // Sentry schedules have minute resolution, twice the check-ins a minute
  // expects is fine. Alerts when sweeps stop, not only when one throws.
  @CronMonitor("customer-status-emails", {
    schedule: { type: "interval", value: 1, unit: "minute" },
    checkinMargin: 1,
    maxRuntime: 5,
  })
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
    if (!stillCurrent || ticket.notificationsStoppedAt || !canEmail(ticket.customer) || ticket.location.deletedAt) {
      return;
    }
    if (event.status.code === "COMPLETED") {
      await this.sendFeedbackRequest(ticket, ticket.customer.email);
    } else if (isNotifyingStatus(event.status.code)) {
      await this.sendCustomerEmail(ticket, ticket.customer.email, event.status.code, "ticket_status_update");
    }
  }

  // ADR 0039: decided when due, with the Location's plan and link then.
  // Claimed first, a Ticket completed again never gets a second one.
  private async sendFeedbackRequest(ticket: LoadedTicket, to: string) {
    if (!asksForFeedback(ticket.location)) {
      return;
    }
    const { count } = await this.prisma.ticket.updateMany({
      where: { id: ticket.id, feedbackEmailSentAt: null },
      data: { feedbackEmailSentAt: new Date() },
    });
    if (count > 0) {
      await this.sendCustomerEmail(ticket, to, "FEEDBACK_REQUEST", "ticket_feedback_request");
    }
  }

  // Queued by TicketService.update when the estimated ready date moves past
  // the last one the Customer was told (ADR 0030).
  @Cron(CronExpression.EVERY_30_SECONDS, { name: "customer-ready-date-emails" })
  @CronMonitor("customer-ready-date-emails", {
    schedule: { type: "interval", value: 1, unit: "minute" },
    checkinMargin: 1,
    maxRuntime: 5,
  })
  async sendDueReadyDateEmails() {
    const due = await this.prisma.ticket.findMany({
      where: { readyDateEmailDueAt: { lte: new Date() } },
      orderBy: { readyDateEmailDueAt: "asc" },
      select: { id: true, readyDateEmailDueAt: true },
    });

    for (const { id, readyDateEmailDueAt } of due) {
      // Claimed the same way as status emails, see sendDueStatusEmails.
      const lease = new Date(Date.now() + CLAIM_LEASE_MS);
      const { count } = await this.prisma.ticket.updateMany({
        where: { id, readyDateEmailDueAt },
        data: { readyDateEmailDueAt: lease },
      });
      if (count === 0) {
        continue;
      }
      await this.sendReadyDateEmail(id);
      // A date changed during the send queued its own email, left as is.
      await this.prisma.ticket.updateMany({
        where: { id, readyDateEmailDueAt: lease },
        data: { readyDateEmailDueAt: null },
      });
    }
  }

  private async sendReadyDateEmail(ticketId: bigint) {
    const ticket = await this.loadTicket(ticketId);
    const date = toCalendarDate(ticket.estimatedReadyDate);
    const told = toCalendarDate(ticket.customerToldReadyDate);
    // Moved back within the delay, or overtaken by the ticket reaching READY.
    if (
      !date ||
      !told ||
      date <= told ||
      !showsEstimatedReadyDate(ticket.currentStatus.code) ||
      ticket.notificationsStoppedAt ||
      !canEmail(ticket.customer) ||
      ticket.location.deletedAt
    ) {
      return;
    }
    await this.sendCustomerEmail(ticket, ticket.customer.email, "READY_DATE_CHANGED", "ticket_ready_date_changed");
  }

  // Reminders for items still waiting at READY (ADR 0028, ADR 0037).
  // Every 15 minutes is precise enough for a reminder counted in days.
  @Cron("0 */15 * * * *", { name: "customer-ready-reminders" })
  @CronMonitor("customer-ready-reminders", {
    schedule: { type: "crontab", value: "*/15 * * * *" },
    checkinMargin: 5,
    maxRuntime: 10,
  })
  async sendDueReadyReminders() {
    const now = new Date();
    const due = await this.prisma.ticket.findMany({
      where: {
        nextReadyReminderAt: { lte: now },
        currentStatus: { code: "READY" },
        customerCollectedAt: null,
        notificationsStoppedAt: null,
        location: { deletedAt: null },
      },
      orderBy: { nextReadyReminderAt: "asc" },
      select: { id: true, nextReadyReminderAt: true, location: { select: { timeZone: true } } },
    });

    for (const { id, nextReadyReminderAt: dueAt, location } of due) {
      // Due at night, it stays due and leaves with the first sweep after 9:00.
      if (!isReminderHour(now, location.timeZone)) {
        continue;
      }
      // Claimed the same way as status emails, see sendDueStatusEmails.
      const lease = new Date(Date.now() + CLAIM_LEASE_MS);
      const { count } = await this.prisma.ticket.updateMany({
        where: { id, nextReadyReminderAt: dueAt },
        data: { nextReadyReminderAt: lease },
      });
      if (count === 0) {
        continue;
      }

      const ticket = await this.loadTicket(id);
      // Changed since the query: handed back as it was, a later READY or a
      // dismissed mark decides what happens next.
      if (ticket.currentStatus.code !== "READY" || ticket.customerCollectedAt || ticket.notificationsStoppedAt) {
        await this.prisma.ticket.updateMany({
          where: { id, nextReadyReminderAt: lease },
          data: { nextReadyReminderAt: dueAt },
        });
        continue;
      }
      if (canEmail(ticket.customer)) {
        await this.sendCustomerEmail(ticket, ticket.customer.email, "READY_REMINDER", "ticket_ready_reminder");
      }
      // Counted even when there was no one to email, so the next one is
      // scheduled rather than retried every sweep. A READY reached during
      // the send rescheduled it already, and wins.
      const sent = ticket.readyRemindersSent + 1;
      await this.prisma.ticket.updateMany({
        where: { id, nextReadyReminderAt: lease },
        data: {
          readyRemindersSent: sent,
          // The latest event is the one that set READY, the sweep only takes READY tickets.
          nextReadyReminderAt: nextReadyReminderAt(ticket.statusEvents[0].createdAt, sent),
        },
      });
    }
  }

  private loadTicket(ticketId: bigint) {
    return this.prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      include: {
        customer: true,
        currentStatus: true,
        location: { include: { businessType: true, subscription: true } },
        // The latest event only: when the ticket reached its current status.
        statusEvents: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1 },
      },
    });
  }

  private async sendCustomerEmail(ticket: LoadedTicket, to: string, kind: CustomerEmailKind, type: string) {
    const estimatedReadyDate = showsEstimatedReadyDate(ticket.currentStatus.code)
      ? toCalendarDate(ticket.estimatedReadyDate)
      : null;
    const { subject, react } = buildCustomerEmail({
      kind,
      locale: ticket.customer.locale ?? ticket.location.locale,
      businessTypeCode: ticket.location.businessType.code,
      customerName: ticket.customer.fullName,
      ticketTitle: ticket.title,
      estimatedReadyDate,
      location: {
        ...ticket.location,
        address: toPostalAddress(ticket.location),
        logoUrl: publicImageUrl(ticket.location.logoKey),
      },
      trackingUrl: trackingUrl(ticket.trackingCode),
      collectedUrl: collectedUrl(ticket.trackingCode),
      asksForFeedback: asksForFeedback(ticket.location),
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
    // What a later date is compared to. Only the emails that state the date
    // tell it, a status email doesn't.
    if (estimatedReadyDate && (kind === "TICKET_CREATED" || kind === "READY_DATE_CHANGED")) {
      await this.prisma.ticket.update({
        where: { id: ticket.id },
        data: { customerToldReadyDate: ticket.estimatedReadyDate },
      });
    }
  }
}
