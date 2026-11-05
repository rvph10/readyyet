import { calendarDateIn, ERASED_CUSTOMER_NAME, isEndedStatus, STATUS_UNDO_WINDOW_MS } from "@readyyet/shared";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QrCode } from "@/components/qr-code";
import { RefreshWhileOpen } from "@/components/refresh-while-open";
import { statusDotClass, StatusPill } from "@/components/status-pill";
import { Banner } from "@/components/ui/banner";
import { Icon } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { getMe } from "@/lib/me";
import { statusLabel } from "@/lib/status-label";
import { formatDay, formatMoment } from "../../(tickets)/ticket-views";
import { statusChoices } from "./status-choices";
import { StatusActions } from "./status-actions";
import { TicketDetails } from "./ticket-details";
import { TicketPhotos } from "./ticket-photos";
import { TrackingPanel } from "./tracking-panel";

// Colleagues move Tickets too, and a photo's address expires after 15 minutes.
const REFRESH_EVERY_MS = 60 * 1000;

export default async function TicketPage({ params }: PageProps<"/locations/[locationId]/tickets/[ticketId]">) {
  const [{ locationId, ticketId }, t, locale, client, me] = await Promise.all([
    params,
    getTranslations("ticketDetail"),
    getLocale(),
    api(),
    getMe(),
  ]);
  const path = { path: { locationId } };
  const [ticket, location] = await Promise.all([
    client
      .GET("/locations/{locationId}/tickets/{ticketId}", { params: { path: { locationId, ticketId } } })
      .then(pageData),
    client.GET("/locations/{locationId}", { params: path }).then(pageData),
  ]);
  const membership = me.memberships.find((candidate) => candidate.location.id === locationId);
  if (!membership) notFound();

  const { customer, currentStatus: status } = ticket;
  const now = new Date();
  const today = calendarDateIn(now, location.timeZone);
  const erased = customer.fullName === ERASED_CUSTOMER_NAME;
  const name = erased ? t("erasedCustomer") : customer.fullName;
  const emailFails = Boolean(customer.emailBouncedAt || customer.emailComplainedAt);
  const emailWorks = Boolean(customer.email) && !emailFails;
  const stoppedUpdates = Boolean(ticket.notificationsStoppedAt);
  const { next, others } = statusChoices(ticket.steps, status.code, membership.role);

  // ADR 0016: only its author, within the window, and never the first event.
  const latest = ticket.statusEvents.at(-1)!;
  const undoEnds = new Date(latest.createdAt).getTime() + STATUS_UNDO_WINDOW_MS;
  const undoUntil =
    ticket.statusEvents.length > 1 && latest.changedBy === me.id && undoEnds > now.getTime()
      ? new Date(undoEnds).toISOString()
      : null;

  return (
    <>
      <RefreshWhileOpen every={REFRESH_EVERY_MS} />
      <header className="flex flex-col gap-3">
        <Link
          href={`/locations/${locationId}`}
          className="inline-flex w-fit items-center gap-2 text-label-sm text-muted transition-colors hover:text-ink"
        >
          <Icon name="arrow-right" className="size-2.5 rotate-180" />
          {t("back")}
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="min-w-0 font-display text-label-xl wrap-anywhere md:text-title-h4">{ticket.title}</h1>
          <StatusPill code={status.code} label={statusLabel(status, locale)} />
        </div>
        <p className="font-mono text-p-xs text-muted">{ticket.trackingCode}</p>
      </header>

      {ticket.emailProblem === "GAVE_UP" && <Banner tone="error">{t("emailGaveUp", { name })}</Banner>}
      {ticket.emailProblem === "RETRYING" && <Banner>{t("emailRetrying", { name })}</Banner>}
      {emailFails && <Banner tone="error">{t("emailFails", { name, email: customer.email ?? "" })}</Banner>}
      {stoppedUpdates && <Banner>{t("updatesStopped", { name })}</Banner>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel as="section" aria-labelledby="ticket-status" className="md:p-6">
            <h2 id="ticket-status" className="mb-4 text-label-lg">
              {t("status")}
            </h2>
            <StatusActions
              locationId={locationId}
              ticketId={ticketId}
              next={next}
              others={others}
              undoUntil={undoUntil}
              collectedAt={status.code === "READY" ? ticket.customerCollectedAt : null}
            />
            <h3 className="mt-6 mb-3 text-label-sm text-muted">{t("history")}</h3>
            <ol className="flex flex-col gap-3">
              {[...ticket.statusEvents].reverse().map((event) => (
                <li key={event.id} className="flex items-baseline gap-3">
                  <span
                    aria-hidden="true"
                    className={`size-2 shrink-0 translate-y-[-1px] rounded-full ${statusDotClass(event.status.code)}`}
                  />
                  <p className="min-w-0 flex-1 text-p-sm wrap-anywhere">
                    <span className="text-label-sm">{statusLabel(event.status, locale)}</span>
                    <span className="text-muted"> · {event.changedByName}</span>
                  </p>
                  <time dateTime={event.createdAt} className="shrink-0 text-p-xs text-muted tabular-nums">
                    {formatMoment(new Date(event.createdAt), location.timeZone, today, locale)}
                  </time>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel as="section" className="md:p-6">
            <TicketDetails
              locationId={locationId}
              ticketId={ticketId}
              title={ticket.title}
              notes={ticket.description}
              date={ticket.estimatedReadyDate}
              dateShown={ticket.estimatedReadyDate && formatDay(ticket.estimatedReadyDate, today, locale)}
              receivedShown={formatMoment(new Date(ticket.createdAt), location.timeZone, today, locale)}
              timeZone={location.timeZone}
              dateEditable={!isEndedStatus(status.code)}
            />
          </Panel>

          <Panel as="section" className="md:p-6">
            <TicketPhotos
              locationId={locationId}
              ticketId={ticketId}
              photos={ticket.photos}
              canAdd={!ticket.trackingLinkExpired}
              deletableBy={{ userId: me.id, any: membership.role !== "EMPLOYEE" }}
            />
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel as="section" aria-labelledby="ticket-customer" className="md:p-6">
            <h2 id="ticket-customer" className="mb-4 text-label-lg">
              {t("customer")}
            </h2>
            <p className="text-label-md wrap-anywhere">{name}</p>
            {customer.email && (
              <a
                href={`mailto:${customer.email}`}
                className="mt-2 block text-p-sm wrap-anywhere text-muted transition-colors hover:text-ink"
              >
                {customer.email}
              </a>
            )}
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="mt-1 block text-p-sm text-muted tabular-nums transition-colors hover:text-ink"
              >
                {customer.phone}
              </a>
            )}
            {!erased && !customer.email && !customer.phone && (
              <p className="mt-2 text-p-sm text-muted">{t("noContact")}</p>
            )}
          </Panel>

          {!erased && (
            <Panel as="section" aria-labelledby="ticket-tracking" className="md:p-6">
              <h2 id="ticket-tracking" className="mb-4 text-label-lg">
                {t("tracking")}
              </h2>
              {ticket.trackingLinkExpired ? (
                <p className="text-p-sm text-muted">{t("linkExpired")}</p>
              ) : (
                <TrackingPanel
                  locationId={locationId}
                  ticketId={ticketId}
                  url={ticket.trackingUrl}
                  qr={<QrCode value={ticket.trackingUrl} label={t("qrLabel", { name })} className="w-full" />}
                  qrFirst={!emailWorks || ticket.emailProblem !== null}
                  resendTo={emailWorks ? customer.email : null}
                />
              )}
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
