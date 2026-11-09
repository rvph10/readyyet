import {
  calendarDateIn,
  ERASED_CUSTOMER_NAME,
  isEndedStatus,
  STATUS_UNDO_WINDOW_MS,
  LONG_WAIT_DAYS,
} from "@readyyet/shared";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode } from "react";
import { PhoneNumber } from "@/components/phone-number";
import { QrCode } from "@/components/qr-code";
import { RefreshWhileOpen } from "@/components/refresh-while-open";
import { WorkflowTrack } from "@/components/workflow-track";
import { StatusMark } from "@/components/status-pill";
import { Avatar } from "@/components/ui/avatar";
import { Banner } from "@/components/ui/banner";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { getMe } from "@/lib/me";
import { statusLabel } from "@/lib/status-label";
import { PageHeader } from "../../page-header";
import { daysBetween, expected, formatDay, formatMoment } from "../ticket-views";
import { isStopped, statusChoices } from "./status-choices";
import { StatusPanel } from "./status-panel";
import { TicketDetails } from "./ticket-details";
import { TicketPhotos } from "./ticket-photos";
import { TrackingPanel } from "./tracking-panel";
import { Reveal } from "@/components/reveal";

// Colleagues move Tickets too, and a photo's address expires after 15 minutes.
const REFRESH_EVERY_MS = 60 * 1000;

// ADR 0108's two columns. ADR 0119: drawn at once with their titles, each
// panel's content waiting for the Ticket.
export default async function TicketPage({ params }: PageProps<"/locations/[locationId]/tickets/[ticketId]">) {
  const { locationId, ticketId } = await params;
  return (
    <>
      <RefreshWhileOpen every={REFRESH_EVERY_MS} />
      <Reveal
        fallback={
          <>
            <PageHeader title={null} crumb={`#${ticketId}`} />
            <TicketLoading />
          </>
        }
      >
        <TicketContent locationId={locationId} ticketId={ticketId} />
      </Reveal>
    </>
  );
}

async function TicketContent({ locationId, ticketId }: { locationId: string; ticketId: string }) {
  const [t, tTickets, locale, client, me] = await Promise.all([
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
      <PageHeader title={ticket.title} crumb={`#${ticket.id}`} />

      {ticket.emailProblem === "GAVE_UP" && (
        <Banner tone="error">{t(ended ? "emailGaveUpEnded" : "emailGaveUp", { name })}</Banner>
      )}
      {ticket.emailProblem === "RETRYING" && (
        <Banner>{t(ended ? "emailRetryingEnded" : "emailRetrying", { name })}</Banner>
      )}
      {emailFails && <Banner tone="error">{t("emailFails", { name, email: customer.email ?? "" })}</Banner>}
      {stoppedUpdates && <Banner>{t("updatesStopped", { name })}</Banner>}

      <Columns
        work={
          <>
            <StatusPanel
              className="max-xl:order-1 md:max-xl:col-span-2"
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
                  horizontal
                  steps={track}
                  currentCode={status.code}
                  reachedCode={reached?.status.code ?? null}
                  label={t("workflow")}
                />
              }
            />

            <Panel as="section" padding="lg" className="max-xl:order-3">
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

            <Panel as="section" padding="lg" className="flex flex-col max-xl:order-4 xl:flex-1">
              <TicketPhotos
                locationId={locationId}
                ticketId={ticketId}
                photos={ticket.photos}
                canAdd={!ticket.trackingLinkExpired}
                deletableBy={{ userId: me.id, any: membership.role !== "EMPLOYEE" }}
              />
            </Panel>
          </>
        }
        side={
          <>
            <Panel as="section" aria-labelledby="ticket-customer" padding="lg" className="max-xl:order-2">
              <h2 id="ticket-customer" className="sr-only">
                {t("customer")}
              </h2>
              <div className="flex items-center gap-3">
                <Avatar id={customer.fullName} name={name} src={null} size="lg" />
                <div className="min-w-0">
                  {erased ? (
                    <p className="text-label-md wrap-anywhere">{name}</p>
                  ) : (
                    <Link
                      href={`/locations/${locationId}/customers/${customer.id}`}
                      className="text-label-md wrap-anywhere underline-offset-4 hover:underline"
                    >
                      {name}
                    </Link>
                  )}
                  {customer.phone && (
                    <p className="text-p-sm text-muted">
                      <PhoneNumber value={customer.phone} />
                    </p>
                  )}
                  {customer.email && <p className="text-p-sm wrap-anywhere text-muted">{customer.email}</p>}
                  {!erased && !customer.email && !customer.phone && (
                    <p className="text-p-sm text-muted">{t("noContact")}</p>
                  )}
                </div>
              </div>
              {(customer.phone || customer.email) && (
                <div className="mt-4 flex gap-2">
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

            {!erased && (
              <Panel as="section" aria-labelledby="ticket-tracking" padding="lg" className="max-xl:order-5">
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

            <Panel
              as="section"
              aria-labelledby="ticket-history"
              padding="lg"
              className="flex flex-col max-xl:order-6 md:max-xl:col-span-2 xl:min-h-72 xl:flex-1"
            >
              <h2 id="ticket-history" className="text-title-h6">
                {t("history")}
              </h2>
              {/* It grows with every change, so it scrolls inside its tile. */}
              <ol className="mt-4 min-h-0 overflow-y-auto max-xl:max-h-80 xl:grow xl:basis-0">
                {[...ticket.statusEvents].reverse().map((event) => (
                  <li key={event.id} className="group relative flex gap-3 pb-4 last:pb-0">
                    <span
                      aria-hidden="true"
                      className="absolute top-9 bottom-0 left-4 w-0.5 -translate-x-1/2 bg-border group-last:hidden"
                    />
                    <StatusMark code={event.status.code} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-label-sm">{statusLabel(event.status, locale)}</p>
                      <p className="truncate text-p-xs text-muted" title={event.changedByName}>
                        <time dateTime={event.createdAt}>{moment(event.createdAt)}</time>, {event.changedByName}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
          </>
        }
      />
    </>
  );
}

// ADR 0108: the work on the left, the Customer's side on the right. Each
// column stacks on its own, so no tile is stretched to match a neighbour, and
// the last one takes what's left. Under 1280px the columns dissolve, and the
// order puts the Customer straight after the Status.
function Columns({ work, side }: { work: ReactNode; side: ReactNode }) {
  return (
    <div className="grid flex-1 gap-3 md:grid-cols-2 lg:gap-5 xl:grid-cols-12">
      <div className="contents xl:col-span-8 xl:flex xl:min-w-0 xl:flex-col xl:gap-5">{work}</div>
      <div className="contents xl:col-span-4 xl:flex xl:min-w-0 xl:flex-col xl:gap-5">{side}</div>
    </div>
  );
}

// The same panels and titles, their contents waiting for the Ticket.
function TicketLoading() {
  const t = useTranslations("ticketDetail");
  return (
    <div aria-busy="true" className="contents">
      <Columns
        work={
          <>
            <Panel className="flex flex-col gap-6 max-xl:order-1 md:max-xl:col-span-2 lg:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-p-sm text-muted">{t("status")}</p>
                  <Skeleton className="h-8 w-44" />
                  <Skeleton className="h-4 w-52 max-w-full" />
                </div>
                <div className="hidden gap-3 sm:flex">
                  <Skeleton className="h-12 w-44 rounded-full!" />
                  <Skeleton className="h-12 w-40 rounded-full!" />
                </div>
              </div>
              <div className="flex justify-around gap-4 py-2">
                {[0, 1, 2].map((step) => (
                  <div key={step} className="flex flex-col items-center gap-2.5">
                    <Skeleton className="size-10 rounded-full!" />
                    <Skeleton className="h-3.5 w-16" />
                  </div>
                ))}
              </div>
            </Panel>
            <Panel padding="lg" className="flex flex-col gap-4 max-xl:order-3">
              <h2 className="text-title-h6">{t("details")}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-16 rounded-2xl!" />
                <Skeleton className="h-16 rounded-2xl!" />
                <Skeleton className="h-16 rounded-2xl! sm:col-span-2" />
              </div>
            </Panel>
            <Panel padding="lg" className="flex flex-col gap-4 max-xl:order-4 xl:flex-1">
              <h2 className="text-title-h6">{t("photos")}</h2>
              <Skeleton className="min-h-28 flex-1 rounded-2xl!" />
            </Panel>
          </>
        }
        side={
          <>
            <Panel padding="lg" className="flex flex-col gap-4 max-xl:order-2">
              <div className="flex items-center gap-3">
                <Skeleton className="size-14 shrink-0 rounded-full!" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-32 max-w-full" />
                  <Skeleton className="h-4 w-40 max-w-full" />
                </div>
              </div>
              <Skeleton className="h-10 rounded-full!" />
            </Panel>
            <Panel padding="lg" className="flex flex-col gap-3 max-xl:order-5">
              <h2 className="mb-1 text-title-h6">{t("tracking")}</h2>
              <Skeleton className="h-12 rounded-full!" />
              <Skeleton className="h-16 rounded-2xl!" />
            </Panel>
            <Panel
              padding="lg"
              className="flex flex-col gap-4 max-xl:order-6 md:max-xl:col-span-2 xl:min-h-72 xl:flex-1"
            >
              <h2 className="text-title-h6">{t("history")}</h2>
              {[0, 1, 2].map((event) => (
                <div key={event} className="flex items-center gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-full!" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-40 max-w-full" />
                  </div>
                </div>
              ))}
            </Panel>
          </>
        }
      />
    </div>
  );
}
