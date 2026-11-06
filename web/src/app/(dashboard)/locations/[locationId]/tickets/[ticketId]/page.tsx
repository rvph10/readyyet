import { calendarDateIn, ERASED_CUSTOMER_NAME, isEndedStatus, STATUS_UNDO_WINDOW_MS } from "@readyyet/shared";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PhoneNumber } from "@/components/phone-number";
import { QrCode } from "@/components/qr-code";
import { RefreshWhileOpen } from "@/components/refresh-while-open";
import { StatusPill } from "@/components/status-pill";
import { Avatar } from "@/components/ui/avatar";
import { Banner } from "@/components/ui/banner";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { getMe } from "@/lib/me";
import { statusLabel } from "@/lib/status-label";
import { PageHeader } from "../../page-header";
import { daysBetween, expected, formatDay, formatMoment, LONG_WAIT_DAYS } from "../ticket-views";
import { isStopped, statusChoices } from "./status-choices";
import { StatusPanel } from "./status-panel";
import { TicketDetails } from "./ticket-details";
import { TicketPhotos } from "./ticket-photos";
import { TrackingPanel } from "./tracking-panel";
import { WorkflowTrack } from "./workflow-track";

// Colleagues move Tickets too, and a photo's address expires after 15 minutes.
const REFRESH_EVERY_MS = 60 * 1000;

export default async function TicketPage({ params }: PageProps<"/locations/[locationId]/tickets/[ticketId]">) {
  const [{ locationId, ticketId }, t, tTickets, locale, client, me] = await Promise.all([
    params,
    getTranslations("ticketDetail"),
    getTranslations("tickets"),
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
  const ended = isEndedStatus(status.code);
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

  const track = ticket.steps
    .filter(({ status: step }) => !isStopped(step.code) && step.code !== "COMPLETED")
    .map(({ status: step }) => ({ code: step.code, label: statusLabel(step, locale) }));
  const reached = [...ticket.statusEvents]
    .reverse()
    .find((event) => track.some(({ code }) => code === event.status.code));
  const due = expected(ticket.estimatedReadyDate, status.code, today);
  const late = due?.key === "late";
  const readyDays = daysBetween(calendarDateIn(new Date(latest.createdAt), location.timeZone), today);
  const moment = (instant: string) =>
    formatMoment(new Date(instant), location.timeZone, today, locale, (parts) => t("moment", parts));
  const flag = late
    ? { text: tTickets("lateBy", { days: daysBetween(due.date, today) }), urgent: true }
    : status.code === "READY"
      ? { text: tTickets("waiting", { days: readyDays }), urgent: readyDays >= LONG_WAIT_DAYS }
      : null;

  return (
    <>
      <RefreshWhileOpen every={REFRESH_EVERY_MS} />
      <PageHeader
        locationId={locationId}
        title={ticket.title}
        subtitle={t("subtitle", {
          id: ticket.id,
          name,
          date: formatDay(calendarDateIn(new Date(ticket.createdAt), location.timeZone), today, locale),
        })}
        backHref={`/locations/${locationId}/tickets`}
      />

      {ticket.emailProblem === "GAVE_UP" && (
        <Banner tone="error">{t(ended ? "emailGaveUpEnded" : "emailGaveUp", { name })}</Banner>
      )}
      {ticket.emailProblem === "RETRYING" && (
        <Banner>{t(ended ? "emailRetryingEnded" : "emailRetrying", { name })}</Banner>
      )}
      {emailFails && <Banner tone="error">{t("emailFails", { name, email: customer.email ?? "" })}</Banner>}
      {stoppedUpdates && <Banner>{t("updatesStopped", { name })}</Banner>}

      {/* ADR 0090: one grid, so each area takes the space it deserves. */}
      <div className="grid gap-3 md:grid-cols-2 lg:gap-5 xl:grid-cols-4">
        <StatusPanel
          className="md:col-span-2 xl:col-span-3"
          locationId={locationId}
          ticketId={ticketId}
          status={status}
          flag={flag}
          since={t("since", {
            date: formatDay(calendarDateIn(new Date(latest.createdAt), location.timeZone), today, locale),
            name: latest.changedByName,
          })}
          next={next}
          others={others}
          ended={ended}
          undoUntil={undoUntil}
          collectedAt={status.code === "READY" ? ticket.customerCollectedAt : null}
          track={
            <WorkflowTrack
              steps={track}
              currentCode={status.code}
              reachedCode={reached?.status.code ?? null}
              label={t("workflow")}
            />
          }
        />

        <Panel as="section" aria-labelledby="ticket-customer" className="flex flex-col">
          <h2 id="ticket-customer" className="text-title-h6">
            {t("customer")}
          </h2>
          <div className="mt-4 flex items-center gap-3">
            <Avatar id={customer.fullName} name={name} src={null} size="lg" />
            <p className="min-w-0 text-label-md wrap-anywhere">{name}</p>
          </div>
          <div className="mt-4 flex flex-col gap-1">
            {customer.phone && (
              <p className="text-p-sm text-muted">
                <PhoneNumber value={customer.phone} />
              </p>
            )}
            {customer.email && <p className="text-p-sm wrap-anywhere text-muted">{customer.email}</p>}
            {!erased && !customer.email && !customer.phone && <p className="text-p-sm text-muted">{t("noContact")}</p>}
          </div>
          {(customer.phone || customer.email) && (
            <div className="mt-auto flex gap-2 pt-5">
              {customer.phone && (
                <a
                  href={`tel:${customer.phone}`}
                  className={`${buttonClass({ variant: "secondary", size: "sm" })} min-w-0 flex-1`}
                >
                  <Icon name="phone" className="size-3.5" />
                  {t("call")}
                </a>
              )}
              {customer.email && (
                <a
                  href={`mailto:${customer.email}`}
                  className={`${buttonClass({ variant: "secondary", size: "sm" })} min-w-0 flex-1`}
                >
                  <Icon name="message" className="size-3.5" />
                  {t("sendEmail")}
                </a>
              )}
            </div>
          )}
        </Panel>

        <Panel as="section" className="xl:col-span-2">
          <TicketDetails
            locationId={locationId}
            ticketId={ticketId}
            title={ticket.title}
            notes={ticket.description}
            date={ticket.estimatedReadyDate}
            dateShown={ticket.estimatedReadyDate && formatDay(ticket.estimatedReadyDate, today, locale)}
            receivedShown={moment(ticket.createdAt)}
            timeZone={location.timeZone}
            today={today}
            dateEditable={!ended}
            dateLate={late}
          />
        </Panel>

        <Panel
          as="section"
          aria-labelledby="ticket-history"
          className={`flex flex-col md:min-h-72 xl:row-span-2 ${erased ? "xl:col-span-2" : ""}`}
        >
          <h2 id="ticket-history" className="text-title-h6">
            {t("history")}
          </h2>
          {/* It grows with every change, so it scrolls inside its tile. */}
          <ol className="mt-3 min-h-0 overflow-y-auto max-md:max-h-72 md:grow md:basis-0">
            {[...ticket.statusEvents].reverse().map((event) => (
              <li key={event.id} className="border-t border-border py-3 first:border-t-0 first:pt-0">
                <StatusPill code={event.status.code} label={statusLabel(event.status, locale)} />
                <p className="mt-1.5 text-p-xs text-muted">
                  <time dateTime={event.createdAt}>{moment(event.createdAt)}</time>
                </p>
                <p className="truncate text-p-xs text-muted">{event.changedByName}</p>
              </li>
            ))}
          </ol>
        </Panel>

        {!erased && (
          <Panel as="section" aria-labelledby="ticket-tracking" className="flex flex-col xl:row-span-2">
            <h2 id="ticket-tracking" className="mb-4 text-title-h6">
              {t("tracking")}
            </h2>
            {ticket.trackingLinkExpired ? (
              <p className="text-p-sm text-muted">{t("linkExpired")}</p>
            ) : (
              <TrackingPanel
                locationId={locationId}
                ticketId={ticketId}
                url={ticket.trackingUrl}
                code={ticket.trackingCode}
                qr={<QrCode value={ticket.trackingUrl} label={t("qrLabel", { name })} className="w-full" />}
                qrFirst={!emailWorks || ticket.emailProblem !== null}
                resendTo={emailWorks ? customer.email : null}
              />
            )}
          </Panel>
        )}

        <Panel as="section" className="md:col-span-2">
          <TicketPhotos
            locationId={locationId}
            ticketId={ticketId}
            photos={ticket.photos}
            canAdd={!ticket.trackingLinkExpired}
            deletableBy={{ userId: me.id, any: membership.role !== "EMPLOYEE" }}
          />
        </Panel>
      </div>
    </>
  );
}
